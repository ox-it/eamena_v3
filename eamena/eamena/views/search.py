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

from datetime import datetime
from django.conf import settings
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.db.models import Max, Min
from arches.app.models import models
from arches.app.views.search import get_paginator
from arches.app.views.search import build_search_results_dsl as build_base_search_results_dsl
from arches.app.models.concept import Concept
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.search.elasticsearch_dsl_builder import Bool, Match, Query, Nested, Terms, GeoShape, Range
from django.utils.translation import ugettext as _

from arches.app.views.resources import get_related_resources

import logging

def home_page(request):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    min_max_dates = models.Dates.objects.aggregate(Min('val'), Max('val'))

    return render_to_response('search.htm', {
            'main_script': 'search',
            'active_page': 'Search',
            'min_date': min_max_dates['val__min'].year if min_max_dates['val__min'] != None else 0,
            'max_date': min_max_dates['val__max'].year if min_max_dates['val__min'] != None else 1,
            'timefilterdata': JSONSerializer().serialize(Concept.get_time_filter_data()),
            'group_options': settings.SEARCH_GROUP_ROOTS
        }, 
        context_instance=RequestContext(request))

def search_results(request):

    query = build_search_results_dsl(request)
    
    search_related_resources = JSONDeserializer().deserialize(request.GET.get('searchRelatedResources'))
    
    if search_related_resources:
        logging.warning("Searching in related resources")
        related_resources_from_prev_query = request.session['related-resource-ids']
        ids_filter = Terms(field='entityid', terms=related_resources_from_prev_query)
        query.add_filter(ids_filter)
        
    results = query.search(index='entity', doc_type='') 
    total = results['hits']['total']
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))

    all_entity_ids = ['_all']
    if request.GET.get('include_ids', 'false') == 'false':
        all_entity_ids = ['_none']
    elif request.GET.get('no_filters', '') == '':
        full_results = query.search(index='entity', doc_type='', start=0, limit=1000000, fields=[])
        all_entity_ids = [hit['_id'] for hit in full_results['hits']['hits']]
    
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    start = request.GET.get('start', 0)
    all_related_resource_ids = []
    for hit in results['hits']['hits']:
        related_resources = get_related_resources(hit['_id'], lang, start=start, limit=15)
        related_resources_ids = [r['entityid'] for r in related_resources['related_resources']]
        all_related_resource_ids.extend(related_resources_ids)
    
        #remove duplicates
        all_related_resource_ids = list(set(all_related_resource_ids))

    if not search_related_resources:
        #Store in session for next related resources search
        request.session['related-resource-ids'] = all_related_resource_ids
    
    return get_paginator(results, total, page, settings.SEARCH_ITEMS_PER_PAGE, all_entity_ids)

def build_search_results_dsl(request):
    temporal_filters = JSONDeserializer().deserialize(request.GET.get('temporalFilter', None))
    sorting = {
		"child_entities.label":  {
			"order" : "asc",
			"nested_path": "child_entities",
			"nested_filter": {
				"term": {"child_entities.entitytypeid" : "EAMENA_ID.E42"}
			}			
		}
	}
    query = build_base_search_results_dsl(request)  
    boolfilter = Bool()

    # if 'filters' in temporal_filters:
    #     for temporal_filter in temporal_filters['filters']:
    #         date_type = ''
    #         date = ''
    #         date_operator = ''
    #         for node in temporal_filter['nodes']:
    #             if node['entitytypeid'] == 'DATE_COMPARISON_OPERATOR.E55':
    #                 date_operator = node['value']
    #             elif node['entitytypeid'] == 'date':
    #                 date = node['value']
    #             else:
    #                 date_type = node['value']
    # 
    # 
    #         date_value = datetime.strptime(date, '%Y-%m-%d').isoformat()
    # 
    #         if date_operator == '1': # equals query
    #             range = Range(field='dates.value', gte=date_value, lte=date_value)
    #         elif date_operator == '0': # greater than query 
    #             range = Range(field='dates.value', lt=date_value)
    #         elif date_operator == '2': # less than query
    #             range = Range(field='dates.value', gt=date_value)
    #         
    #         nested = Nested(path='dates', query=range)
    #         if 'inverted' not in temporal_filters:
    #             temporal_filters['inverted'] = False
    # 
    #         if temporal_filters['inverted']:
    #             boolfilter.must_not(nested)
    #         else:
    #             boolfilter.must(nested)
    # 
    #         query.add_filter(boolfilter)
    #  Sorting criterion added to query (AZ 08/02/17)
    query.dsl.update({'sort': sorting})

    return query