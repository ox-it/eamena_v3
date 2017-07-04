from django.contrib.gis.db.models import GeometryField, GeoManager
from django.contrib.gis.geos import GEOSGeometry

from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.search.elasticsearch_dsl_builder import Query, Terms, Bool, Match, Nested


# from arches.app.models import AuthGroup
from django.contrib.auth.models import Group

if not hasattr(Group, 'area'):
    geom = GeometryField()
    geom.contribute_to_class(Group, 'geom')
    objects = GeoManager()
    
    
class EamenaAuthGroup(Group):
    class Meta:
        proxy = True

def canUserAccessResource(user, resourceid):
    # Get the geometry for resource
    se = SearchEngineFactory().create()
    report_info = se.search(index='resource', id=resourceid)
    geometry = JSONSerializer().serialize(report_info['_source']['geometry'])
    
    print('GROUP GEOMETRY: ' + geometry)
    
    
    se = SearchEngineFactory().create()
    query = Query(se, limit=1)
    
    args = { 'id': resourceid }
        
    site_geom = GEOSGeometry(geometry)
    
    for group in user.groups.all():
        group_geom = GEOSGeometry(group.geom)
        if group_geom.contains(site_geom):
            return True;
    
    return False
