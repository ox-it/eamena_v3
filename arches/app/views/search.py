'''
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
'''

from datetime import date
from django.conf import settings
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.core.paginator import Paginator
from django.utils.importlib import import_module
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Max, Min
from arches.app.models import models
from arches.app.models.models import EntityTypes
from arches.app.models.concept import Concept
from arches.app.utils.JSONResponse import JSONResponse
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.views.concept import get_preflabel_from_conceptid
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.search.elasticsearch_dsl_builder import Bool, Match, Query, Nested, Terms, GeoShape, Range
from arches.app.utils.data_management.resources.exporter import ResourceExporter


import csv
import logging

try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO

geocoder = import_module(settings.GEOCODING_PROVIDER)

def home_page(request):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    min_max_dates = models.Dates.objects.aggregate(Min('val'), Max('val'))
    return render_to_response('search.htm', {
            'main_script': 'search',
            'active_page': 'Search',
            'min_date': min_max_dates['val__min'].year if min_max_dates['val__min'] != None else 0,
            'max_date': min_max_dates['val__max'].year if min_max_dates['val__min'] != None else 1,
            'timefilterdata': JSONSerializer().serialize(Concept.get_time_filter_data()),
        }, 
        context_instance=RequestContext(request))
        
def search_terms(request):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    
    query = build_search_terms_dsl(request)
    results = query.search(index='term', doc_type='value')

    for result in results['hits']['hits']:
        prefLabel = get_preflabel_from_conceptid(result['_source']['context'], lang)
        result['_source']['options']['context_label'] = prefLabel['value']

    return JSONResponse(results)

def build_search_terms_dsl(request):
    se = SearchEngineFactory().create()
    searchString = request.GET.get('q', '')
    query = Query(se, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
    boolquery = Bool()
    boolquery.should(Match(field='term', query=searchString.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery.should(Match(field='term.folded', query=searchString.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery.should(Match(field='term.folded', query=searchString.lower(), fuzziness='AUTO'))
    query.add_query(boolquery)
    return query

def search_results(request):
    dsl = build_search_results_dsl(request)
    results = dsl.search(index='entity', doc_type='')
    total = results['hits']['total']
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))
    all_entity_ids = ['_all']
    if request.GET.get('include_ids', 'false') == 'false':
        all_entity_ids = ['_none']
    elif request.GET.get('no_filters', '') == '':
        full_results = dsl.search(index='entity', doc_type='', start=0, limit=1000000, fields=[])
        all_entity_ids = [hit['_id'] for hit in full_results['hits']['hits']]
    return get_paginator(results, total, page, settings.SEARCH_ITEMS_PER_PAGE, all_entity_ids)

def build_search_results_dsl(request):
#    Results are sorted ascendingly by the value of SITE_ID.E42, which is displayed as primary name of Heritage Resources. 
#    Must go back to this method once new Automatic Resource ID has been fully developed (AZ 10/08/16) Update 06/09/16: EAMENA_ID.E42 now used as sorting criterion.
    sorting = {
		"child_entities.label":  {
			"order" : "asc",
			"nested_path": "child_entities",
			"nested_filter": {
				"term": {"child_entities.entitytypeid" : "EAMENA_ID.E42"}
			}
		}
	}
    
    term_filter = request.GET.get('termFilter', '')
    spatial_filter = JSONDeserializer().deserialize(request.GET.get('spatialFilter', None)) 
    export = request.GET.get('export', None)
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))
    temporal_filter = JSONDeserializer().deserialize(request.GET.get('temporalFilter', None))
    boolean_search = request.GET.get('booleanSearch', '')
    filter_grouping = JSONDeserializer().deserialize(request.GET.get('termFilterGrouping', ''))
    se = SearchEngineFactory().create()

    if export != None:
        limit = settings.SEARCH_EXPORT_ITEMS_PER_PAGE  
    else:
        limit = settings.SEARCH_ITEMS_PER_PAGE
    
    query = Query(se, start=limit*int(page-1), limit=limit)
    boolquery = Bool()
    boolfilter = Bool()
    if term_filter != '':
        for index, select_box in enumerate(JSONDeserializer().deserialize(term_filter)):
            selectbox_boolfilter = Bool()
            if filter_grouping[index] == 'group':
                # logging.warning("-=-==-=-GROUP select_box: -=-==-=-===-=--=-==-=-===-=-> %s", select_box)
                
                # Resource Names (parent: NAME.E41)
                # Site function (SITE_FUNCTION_TYPE.E55)
                # Cultural period (CULTURAL_PERIOD.E55)
                # Assessment (ASSESSMENT_TYPE.E55)
                # Feature form (FEATURE_EVIDENCE_ASSIGNMENT.E17)
                # Feature interpretation (FEATURE_EVIDENCE_INTERPRETATION_ASSIGNMENT.E17)
                # Disturbance assessment (DISTURBANCE_STATE.E3)
                # Threat assessment (THREAT_STATE.E3)
                # Designation (PROTECTION_EVENT.E65)
                # Measurements (MEASUREMENT_TYPE.E55)
                # Addresses (PLACE_ADDRESS.E45)
                # Administrative areas (ADMINISTRATIVE_SUBDIVISION.E48)
                group = ""
                for term in select_box:
                    if term['type'] == 'term':
                        logging.warning("-=-==-=- GROUP->term  : -=-==-=-===-=--=-==-=-===-=-> %s", term['context_label'])
                        if term['context_label'] == 'Name.E41':
                            group = "Resource Names"
                            
                    elif term['type'] == 'concept':
                        logging.warning("-=-==-=- GROUP->concept  : -=-==-=-===-=--=-==-=-===-=-> %s", term['context_label'])
                        if term['context_label'] == 'Site Function Type':
                            group = "Site Function Type"
                        elif term['context_label'] == 'Cultural Period':
                            group = "Cultural Period"
                        elif term['context_label'] == 'Assessment Type':
                            group = "Assessment Type"
                        elif term['context_label'] == 'Feature Evidence Type':
                            group = "Feature Evidence Type"
                        
                logging.warning("-=-==-=- GROUP-> %s", group)
                if group == "Resource Names":
                    term = next((t for t in select_box if t['context_label'] == 'Name Type'))
                    concept_ids = _get_child_concepts(term['value'])
                    terms = Terms(field='nested_entity.child_entities.child_entities.conceptid', terms=concept_ids)
                    child_bool = Bool()
                    child_bool.must(terms)
                    child_nested = Nested(path='nested_entity.child_entities.child_entities', query=child_bool)

                    term = next((t for t in select_box if t['context_label'] == 'Name.E41'))
                    entitytype = models.EntityTypes.objects.get(conceptid_id=term['context'])
                    parent_bool = Bool()
                    parent_bool.must(Terms(field='nested_entity.child_entities.entitytypeid', terms=[entitytype.pk]))
                    parent_bool.must(Match(field='nested_entity.child_entities.value', query=term['value'], type='phrase'))
                    parent_bool.must(child_nested)
                    parent_nested = Nested(path='nested_entity.child_entities', query=parent_bool)
                    
                elif group == "Site Function Type" or group == "Cultural Period" or group == "Assessment Type":
                    if group == "Site Function Type":
                        parent_string = 'Site Function Type'
                        child_string = 'Site Function Certainty Type'
                        parent_field = 'nested_entity.child_entities'
                    elif group == "Cultural Period":
                        parent_string = 'Cultural Period'
                        child_string = 'Cultural Period Certainty Type'
                        parent_field = 'nested_entity.child_entities.child_entities.child_entities'
                    elif group == "Assessment Type":
                        parent_string = 'Assessment Type'
                        child_string = 'Assessor Name Type'
                        parent_field = 'nested_entity.child_entities.child_entities'
                    
                    # matches = (t for t in select_box if t['context_label'] == 'Site Function Type') #matches should allways be 1 ?!?!?!
                    parent_bool = Bool()
                    term = next((t for t in select_box if t['context_label'] == child_string), None)
                    if term is not None:
                        concept_ids = _get_child_concepts(term['value'])
                        terms = Terms(field=parent_field + '.child_entities.conceptid', terms=concept_ids)
                        child_bool = Bool()
                        child_bool.must(terms)
                        child_nested = Nested(path=parent_field + '.child_entities', query=child_bool)
                        parent_bool.must(child_nested)
                    
                    term = next((t for t in select_box if t['context_label'] == parent_string))
                    concept_ids = _get_child_concepts(term['value'])
                    terms = Terms(field=parent_field + '.conceptid', terms=concept_ids)
                    parent_bool.must(terms)
                    parent_nested = Nested(path=parent_field, query=parent_bool)
                    
                elif group == "Feature Evidence Type":
                    parent_field = 'nested_entity.child_entities.child_entities.child_entities'
                    children_strings = ['Feature Evidence Type', 'Feature Evidence Type Certainty Type', 'Feature Evidence Shape Type', 'Feature Evidence Arrangement Type', 'Feature Evidence Number Type']
                    parent_bool = Bool()
                    
                    for child_string in children_strings:
                        term = next((t for t in select_box if t['context_label'] == child_string), None)
                        if term is not None:
                            concept_ids = _get_child_concepts(term['value'])
                            terms = Terms(field=parent_field + '.child_entities.conceptid', terms=concept_ids)
                            child_bool = Bool()
                            child_bool.must(terms)
                            child_nested = Nested(path=parent_field + '.child_entities', query=child_bool)
                            parent_bool.must(child_nested)
                    
                    parent_nested = Nested(path=parent_field, query=parent_bool)
                    
                selectbox_boolfilter.must(parent_nested)
                logging.warning("-=-=| | | | | -=--===-=-=-=-%s nested-> %s", group, selectbox_boolfilter)
                        
            else:
                for term in select_box:
                    if term['type'] == 'term':
                        entitytype = models.EntityTypes.objects.get(conceptid_id=term['context'])
                        logging.warning("-=-==-=-===-=--=-==-=-===-=- TERM conceptid_id: -=-==-=-===-=--=-==-=-===-=-> %s", term['context'])
                        # logging.warning("-=-==-=-===-=--=-==-=-===-=- entitytype: -=-==-=-===-=--=-==-=-===-=-> %s", entitytype)
                        
                        boolfilter_nested = Bool()
                        boolfilter_nested.must(Terms(field='child_entities.entitytypeid', terms=[entitytype.pk]))
                        boolfilter_nested.must(Match(field='child_entities.value', query=term['value'], type='phrase'))
                        nested = Nested(path='child_entities', query=boolfilter_nested)
                        if filter_grouping[index] == 'or':
                            if not term['inverted']:
                                selectbox_boolfilter.should(nested)
                        else:
                            if term['inverted']:
                                selectbox_boolfilter.must_not(nested)
                            else:    
                                selectbox_boolfilter.must(nested)
                                
                    elif term['type'] == 'concept':
                        concept_ids = _get_child_concepts(term['value'])
                        logging.warning("-=-==-=-===-=--=-==-=-===-=- CONCEPT concept_ids: -=-==-=-===-=--=-==-=-===-=-> %s", term['value'])
                        terms = Terms(field='domains.conceptid', terms=concept_ids)
                        nested = Nested(path='domains', query=terms)
                        if filter_grouping[index] == 'or':
                            if not term['inverted']:
                                    selectbox_boolfilter.should(nested)
                        else:
                            if term['inverted']:
                                selectbox_boolfilter.must_not(nested)
                            else:
                                selectbox_boolfilter.must(nested)
                                
                    elif term['type'] == 'string':
                        boolquery2 = Bool() #This bool contains the subset of nested string queries on both domains and child_entities paths
                        boolfilter_folded = Bool() #This bool searches by string in child_entities, where free text strings get indexed
                        boolfilter_folded2 = Bool() #This bool searches by string in the domains path,where controlled vocabulary concepts get indexed
                        boolfilter_folded.should(Match(field='child_entities.value', query=term['value'], type='phrase_prefix'))
                        boolfilter_folded.should(Match(field='child_entities.value.folded', query=term['value'], type='phrase_prefix'))
                        nested = Nested(path='child_entities', query=boolfilter_folded)
                        boolfilter_folded2.should(Match(field='domains.label', query=term['value'], type='phrase_prefix'))
                        boolfilter_folded2.should(Match(field='domains.label.folded', query=term['value'], type='phrase_prefix'))
                        nested2 = Nested(path='domains', query=boolfilter_folded2)
                        boolquery2.should(nested)
                        boolquery2.should(nested2)
                        if filter_grouping[index] == 'or':
                            if not term['inverted']:
                                # use boolfilter here instead of boolquery because boolquery
                                # can't be combined with other boolfilters using boolean OR
                                selectbox_boolfilter.should(boolquery2)
                        else:
                            if term['inverted']:
                                selectbox_boolfilter.must_not(boolquery2)
                            else:    
                                selectbox_boolfilter.must(boolquery2)
                                
            if not selectbox_boolfilter.empty:
                if boolean_search == 'or':
                    boolfilter.should(selectbox_boolfilter)
                else:
                    boolfilter.must(selectbox_boolfilter)

    if 'geometry' in spatial_filter and 'type' in spatial_filter['geometry'] and spatial_filter['geometry']['type'] != '':
        geojson = spatial_filter['geometry']
        if geojson['type'] == 'bbox':
            coordinates = [[geojson['coordinates'][0],geojson['coordinates'][3]], [geojson['coordinates'][2],geojson['coordinates'][1]]]
            geoshape = GeoShape(field='geometries.value', type='envelope', coordinates=coordinates )
            nested = Nested(path='geometries', query=geoshape)
        else:
            buffer = spatial_filter['buffer']
            geojson = JSONDeserializer().deserialize(_buffer(geojson,buffer['width'],buffer['unit']).json)
            geoshape = GeoShape(field='geometries.value', type=geojson['type'], coordinates=geojson['coordinates'] )
            nested = Nested(path='geometries', query=geoshape)

        if 'inverted' not in spatial_filter:
            spatial_filter['inverted'] = False

        if spatial_filter['inverted']:
            boolfilter.must_not(nested)
        else:
            boolfilter.must(nested)

    if 'year_min_max' in temporal_filter and len(temporal_filter['year_min_max']) == 2:
        start_date = date(temporal_filter['year_min_max'][0], 1, 1)
        end_date = date(temporal_filter['year_min_max'][1], 12, 31)
        if start_date:
            start_date = start_date.isoformat()
        if end_date:
            end_date = end_date.isoformat()
        range = Range(field='dates.value', gte=start_date, lte=end_date)
        nested = Nested(path='dates', query=range)
        
        if 'inverted' not in temporal_filter:
            temporal_filter['inverted'] = False

        if temporal_filter['inverted']:
            boolfilter.must_not(nested)
        else:
            boolfilter.must(nested)
        
    if not boolquery.empty:
        query.add_query(boolquery)

    if not boolfilter.empty:
        query.add_filter(boolfilter)
    
    #  Sorting criterion added to query (AZ 10/08/16)
    query.dsl.update({'sort': sorting})
    # logging.warning("-=-==-=-===- query: ==-=-===-=-> %s", query)

    return query

def buffer(request):
    spatial_filter = JSONDeserializer().deserialize(request.GET.get('filter', {'geometry':{'type':'','coordinates':[]},'buffer':{'width':'0','unit':'ft'}})) 

    if spatial_filter['geometry']['coordinates'] != '' and spatial_filter['geometry']['type'] != '':
        return JSONResponse(_buffer(spatial_filter['geometry'],spatial_filter['buffer']['width'],spatial_filter['buffer']['unit']), geom_format='json')

    return JSONResponse()

def _buffer(geojson, width=0, unit='ft'):
    geojson = JSONSerializer().serialize(geojson)
    
    try:
        width = float(width)
    except:
        width = 0

    if width > 0:
        geom = GEOSGeometry(geojson, srid=4326)
        geom.transform(3857)
        
# Below 2 lines are deprecated in EAMENA's Arches as the unit of choice is EPSG3857's default metres
        if unit == 'ft':
            width = width/3.28084

        buffered_geom = geom.buffer(width)
        buffered_geom.transform(4326)
        return buffered_geom
    else:
        return GEOSGeometry(geojson)

def _get_child_concepts(conceptid):
    ret = set([conceptid])
    for row in Concept().get_child_concepts(conceptid, ['narrower'], ['prefLabel'], 'prefLabel'):
        ret.add(row[0])
        ret.add(row[1])
    return list(ret)

def get_paginator(results, total_count, page, count_per_page, all_ids):
    paginator = Paginator(range(total_count), count_per_page)
    pages = [page]
    if paginator.num_pages > 1:
        before = paginator.page_range[0:page-1]
        after = paginator.page_range[page:paginator.num_pages]
        default_ct = 3
        ct_before = default_ct if len(after) > default_ct else default_ct*2-len(after)
        ct_after = default_ct if len(before) > default_ct else default_ct*2-len(before)
        if len(before) > ct_before:
            before = [1,None]+before[-1*(ct_before-1):]
        if len(after) > ct_after:
            after = after[0:ct_after-1]+[None,paginator.num_pages]
        pages = before+pages+after
    return render_to_response('pagination.htm', {'pages': pages, 'page_obj': paginator.page(page), 'results': JSONSerializer().serialize(results), 'all_ids': JSONSerializer().serialize(all_ids)})

def geocode(request):
    search_string = request.GET.get('q', '')    
    return JSONResponse({ 'results': geocoder.find_candidates(search_string) })

def export_results(request):
    dsl = build_search_results_dsl(request)
    search_results = dsl.search(index='entity', doc_type='') 
    response = None
    format = request.GET.get('export', 'csv')
    exporter = ResourceExporter(format)
    results = exporter.export(search_results['hits']['hits'])
    
    related_resources = [{'id1':rr.entityid1, 'id2':rr.entityid2, 'type':rr.relationshiptype} for rr in models.RelatedResource.objects.all()] 
    csv_name = 'resource_relationships.csv'
    dest = StringIO()
    csvwriter = csv.DictWriter(dest, delimiter=',', fieldnames=['id1','id2','type'])
    csvwriter.writeheader()
    for csv_record in related_resources:
        csvwriter.writerow({k:v.encode('utf8') for k,v in csv_record.items()})
    results.append({'name':csv_name, 'outputfile': dest})
    zipped_results = exporter.zip_response(results, '{0}_{1}_export.zip'.format(settings.PACKAGE_NAME, format))
    return zipped_results
