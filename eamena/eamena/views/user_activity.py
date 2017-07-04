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
from arches.app.models import models
from arches.app.search.search_engine_factory import SearchEngineFactory
import json

def user_activity(request, userid):
    se = SearchEngineFactory().create()
    ret = []
    ret_summary = {}
    current = None
    index = -1
    start = request.GET.get('start', 0)
    limit = request.GET.get('limit', 99)
    if userid != '':
        dates = models.EditLog.objects.filter(userid = userid).values_list('timestamp', flat=True).order_by('-timestamp').distinct('timestamp')[start:limit]

        for log in models.EditLog.objects.filter(userid = userid, timestamp__in = dates).values().order_by('-timestamp', 'attributeentitytypeid'):
            if str(log['timestamp']) != current:
                current = str(log['timestamp'])
                ret.append({'date':str(log['timestamp'].date()), 'time': str(log['timestamp'].time().replace(microsecond=0).isoformat()), 'log': []})
                index = index + 1

            ret[index]['log'].append(log)
            resource = se.search(index='resource', id=log['resourceid'])
            ret[index]['name'] = resource['_source']['primaryname']
            
            if str(log['timestamp'].date()) not in ret_summary:
                ret_summary[str(log['timestamp'].date())] = {'create': 0, 'update': 0, 'insert': 0, 'delete': 0}
            
            ret_summary[str(log['timestamp'].date())][log['edittype']] = ret_summary[str(log['timestamp'].date())][log['edittype']] + 1;
            
        head_text = "no data for this user"
        if len(ret):
            head_text = ret[0]['log'][0]['user_firstname'] +' '+ ret[0]['log'][0]['user_lastname']
            if head_text != ' ' and ret[0]['log'][0]['user_email'] != '':
                head_text += ', '
            head_text += ret[0]['log'][0]['user_email']
            
    return render_to_response('user_activity.htm', {
            'head_text': head_text,
            'activity': ret,
            'activity_summary': json.dumps(ret_summary),
            'main_script': 'heat-chart',
        }, 
        context_instance=RequestContext(request))
            
