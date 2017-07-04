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

# from datetime import datetime
from django.conf import settings
from django.template import RequestContext
from django.shortcuts import render_to_response
# from django.db.models import Max, Min
from arches.app.models import models


import logging
import json
# from arches.app.views.search import get_paginator
# from arches.app.views.search import build_search_results_dsl as build_base_search_results_dsl
# from arches.app.models.concept import Concept
# from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
# from arches.app.search.search_engine_factory import SearchEngineFactory
# from arches.app.search.elasticsearch_dsl_builder import Bool, Match, Query, Nested, Terms, GeoShape, Range
# from django.utils.translation import ugettext as _

from arches.app.utils.JSONResponse import JSONResponse


def user_activity(request, userid):
    # lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    # dates = models.EditLog.objects.filter(user_email = "a@example.com").values_list('timestamp', flat=True).order_by('-timestamp').distinct('timestamp')[start:limit]
    # 
    # return render_to_response('user_activity.htm', {
    #         'test': userid,
    #     }, 
    #     context_instance=RequestContext(request))
    ret = []
    ret_summary = {}
    current = None
    index = -1
    start = request.GET.get('start', 0)
    limit = request.GET.get('limit', 99)
    if userid != '':
        dates = models.EditLog.objects.filter(userid = userid).values_list('timestamp', flat=True).order_by('-timestamp').distinct('timestamp')[start:limit]
        # for date in dates:
        #     #ret[str(date)] = models.EditLog.objects.filter(resourceid = self.resource.entityid, timestamp = date)
        #     print str(date)

        for log in models.EditLog.objects.filter(userid = userid, timestamp__in = dates).values().order_by('-timestamp', 'attributeentitytypeid'):
            if str(log['timestamp']) != current:
                current = str(log['timestamp'])
                ret.append({'date':str(log['timestamp'].date()), 'time': str(log['timestamp'].time().replace(microsecond=0).isoformat()), 'log': []})
                index = index + 1

            ret[index]['log'].append(log)


            if str(log['timestamp'].date()) not in ret_summary:
                ret_summary[str(log['timestamp'].date())] = {'create': 0, 'update': 0, 'insert': 0}
            
            logging.warning("-------- -- - log %s", log)
            # for action in log:
            #     logging.warning("-------- -- - action %s", action)
            ret_summary[str(log['timestamp'].date())][log['edittype']] = ret_summary[str(log['timestamp'].date())][log['edittype']] + 1;
            
    return render_to_response('user_activity.htm', {
            'activity': ret,
            'activity_summary': ret_summary,
            'main_script': 'heat-chart',
        }, 
        context_instance=RequestContext(request))
            
