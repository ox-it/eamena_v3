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
# from django.core.paginator import Paginator

from arches.app.models import models
from arches.app.views.search import get_paginator
from arches.app.views.search import build_search_results_dsl as build_base_search_results_dsl
from arches.app.models.concept import Concept
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.search.elasticsearch_dsl_builder import Bool, Match, Query, Nested, Terms, GeoShape, Range
from django.utils.translation import ugettext as _

from eamena.models.group import canUserAccessResource

def home_page(request):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    min_max_dates = models.Dates.objects.aggregate(Min('val'), Max('val'))

    return render_to_response('search.htm', {
            'main_script': 'search',
            'active_page': 'Search',
            'min_date': min_max_dates['val__min'].year if min_max_dates['val__min'] != None else 0,
            'max_date': min_max_dates['val__max'].year if min_max_dates['val__min'] != None else 1,
            'timefilterdata': JSONSerializer().serialize(Concept.get_time_filter_data())
        }, 
        context_instance=RequestContext(request))

def search_results(request):
    query = build_search_results_dsl(request)
    results = query.search(index='entity', doc_type='')
    
    for result in results['hits']['hits']:
        result['can_access'] = canUserAccessResource(request.user, result['_id'])
    
    total = results['hits']['total']
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))

    all_entity_ids = ['_all']
    if request.GET.get('include_ids', 'false') == 'false':
        all_entity_ids = ['_none']
    elif request.GET.get('no_filters', '') == '':
        full_results = query.search(index='entity', doc_type='', start=0, limit=1000000, fields=[])
        all_entity_ids = [hit['_id'] for hit in full_results['hits']['hits']]
    return get_paginator(results, total, page, settings.SEARCH_ITEMS_PER_PAGE, all_entity_ids)

# def get_paginator(results, total_count, page, count_per_page, all_ids):
#     paginator = Paginator(range(total_count), count_per_page)
#     pages = [page]
#     if paginator.num_pages > 1:
#         before = paginator.page_range[0:page-1]
#         after = paginator.page_range[page:paginator.num_pages]
#         default_ct = 3
#         ct_before = default_ct if len(after) > default_ct else default_ct*2-len(after)
#         ct_after = default_ct if len(before) > default_ct else default_ct*2-len(before)
#         if len(before) > ct_before:
#             before = [1,None]+before[-1*(ct_before-1):]
#         if len(after) > ct_after:
#             after = after[0:ct_after-1]+[None,paginator.num_pages]
#         pages = before+pages+after
#     return render_to_response('pagination.htm', {'pages': pages, 'page_obj': paginator.page(page), 'results': JSONSerializer().serialize(results), 'all_ids': JSONSerializer().serialize(all_ids)})

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

    if 'filters' in temporal_filters:
        for temporal_filter in temporal_filters['filters']:
            date_type = ''
            date = ''
            date_operator = ''
            for node in temporal_filter['nodes']:
                if node['entitytypeid'] == 'DATE_COMPARISON_OPERATOR.E55':
                    date_operator = node['value']
                elif node['entitytypeid'] == 'date':
                    date = node['value']
                else:
                    date_type = node['value']


            date_value = datetime.strptime(date, '%Y-%m-%d').isoformat()

            if date_operator == '1': # equals query
                range = Range(field='dates.value', gte=date_value, lte=date_value)
            elif date_operator == '0': # greater than query 
                range = Range(field='dates.value', lt=date_value)
            elif date_operator == '2': # less than query
                range = Range(field='dates.value', gt=date_value)
            
            nested = Nested(path='dates', query=range)
            if 'inverted' not in temporal_filters:
                temporal_filters['inverted'] = False

            if temporal_filters['inverted']:
                boolfilter.must_not(nested)
            else:
                boolfilter.must(nested)

            query.add_filter(boolfilter)
    #  Sorting criterion added to query (AZ 08/02/17)
    query.dsl.update({'sort': sorting})

    return query