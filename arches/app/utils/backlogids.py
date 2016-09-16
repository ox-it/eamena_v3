import datetime
import re
from django.conf import settings
import uuid
import types
import copy
import arches.app.models.models as archesmodels
from arches.app.models.resource import Resource
from arches.app.models.entity import Entity
from arches.app.search.search_engine_factory import SearchEngineFactory
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import fromstr
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer

def createBacklogIds():
    entitytype = archesmodels.EntityTypes.objects.get(pk = "HERITAGE_RESOURCE_GROUP.E27")
    type = 'EAMENA'
    entities = archesmodels.Entities.objects.filter(entitytypeid__exact = entitytype)

    for count, entity in enumerate(entities, 1):
        if count % 500 == 0:
            print "%s UniqueIds created" % count
        entity2 = archesmodels.Entities()
        entity2.entitytypeid = archesmodels.EntityTypes.objects.get(pk = "EAMENA_ID.E42")
        entity2.entityid = str(uuid.uuid4())
        entity2.save()
        rule = archesmodels.Rules.objects.get(entitytypedomain = entity.entitytypeid, entitytyperange = entity2.entitytypeid, propertyid = 'P1')
        archesmodels.Relations.objects.get_or_create(entityiddomain = entity, entityidrange = entity2, ruleid = rule)
        uniqueidmodel = Entity._get_model('uniqueids')
        uniqueidmodelinstance = uniqueidmodel()
        uniqueidmodelinstance.entityid = entity2
        uniqueidmodelinstance.id_type = type
        try:
            lastID = uniqueidmodel.objects.filter(id_type__exact=type).latest()
            IdInt = int(lastID.val) + 1
            uniqueidmodelinstance.val = str(IdInt)
            
        except:
            uniqueidmodelinstance.val = str(1)
            
        uniqueidmodelinstance.order_date = datetime.datetime.now()
        uniqueidmodelinstance.save()
        
        

        zerosLength = settings.ID_LENGTH if  settings.ID_LENGTH > len(uniqueidmodelinstance.val) else len(uniqueidmodelinstance.val)
        value = type +"-"+uniqueidmodelinstance.val.zfill(zerosLength)
        
        ReindexResource(entity.entityid, entity2.entityid, value)
        
        
def ReindexResource(entityid1, entityid2, value):
    document = Entity()
    document.property = ''
    document.entitytypeid = 'HERITAGE_RESOURCE_GROUP.E27'
    document.entityid = entityid1
    document.value = ''
    document.label = ''
    document.businesstablename = ''
    document.primaryname = value
    document.child_entities = []
    document.dates = []
    document.domains = []
    document.geometries = []
    document.numbers = []

    

    def find_nested(document,domain,topId = None, topType = None, idvalue=None):
        relations = archesmodels.Relations.objects.filter(entityiddomain__exact = domain)
        for relation in relations:
            entityinstance = Entity()
            entityinstance.value = ''
            entityinstance.label = ''               
            entityinstance.child_entities = []         
            entityinstance.entitytypeid = topType
            entityinstance.parentid = topId
            entityinstance.property = ''
            entityinstance.businesstablename = ''
            
            entity = archesmodels.Entities.objects.get(pk=relation.entityidrange_id)
            entitytype = archesmodels.EntityTypes.objects.get(pk = entity.entitytypeid_id)

            rule = archesmodels.Rules.objects.get(entitytyperange__exact = entitytype, ruleid = relation.ruleid_id)
            entityinstance.entitytypeid = entitytype.entitytypeid
            entityinstance.parentid = relation.entityiddomain_id
            entityinstance.entityid = entity.entityid
            entityinstance.property = rule.propertyid_id 
            entityinstance.businesstablename = entitytype.businesstablename
            if entitytype.businesstablename == 'domains':
                value = archesmodels.Domains.objects.get(entityid = entity.entityid)
                entityinstance.conceptid = entitytype.conceptid_id
                entityinstance.label = archesmodels.Values.objects.get(pk = value.val_id).value
                entityinstance.value = value.val_id
                
                document.domains.append(entityinstance)
            elif entitytype.businesstablename == 'dates':
                value = archesmodels.Dates.objects.get(entityid = entity.entityid)
                entityinstance.value = value.val
                entityinstance.label = value.val           
                document.dates.append(entityinstance)
            elif entitytype.businesstablename == 'geometries':
                value = archesmodels.Geometries.objects.get(entityid = entity.entityid)
                entityinstance.value = JSONDeserializer().deserialize(fromstr(value.val.geojson).json)         
                entityinstance.label = value.val.wkt
                document.geometries.append(entityinstance)
            elif entitytype.businesstablename == 'uniqueids':
                entityinstance.label = idvalue
                entityinstance.value = idvalue
                document.child_entities.append(entityinstance)
            elif entitytype.businesstablename == 'strings':
                entityinstance.label = archesmodels.Strings.objects.get(entityid = entity.entityid).val
                entityinstance.value = archesmodels.Strings.objects.get(entityid = entity.entityid).val 
                document.child_entities.append(entityinstance)
            else:
                document.child_entities.append(entityinstance)
                
#             print "Entityid: %s Entitytypeid: %s parentid: %s, property %s, businesstable: %s, label: %s, value: %s" % (entityinstance.entityid, entityinstance.entitytypeid,entityinstance.parentid, entityinstance.property, entityinstance.businesstablename, entityinstance.label, entityinstance.value)
#         if relations:
            find_nested(document,relation.entityidrange, topId, entitytype, idvalue)
#         else:
    
#         

    find_nested(document,entityid1,entityid1,document.entitytypeid,value)
    document=  JSONSerializer().serializeToPython(document)
    
    se = SearchEngineFactory().create()



#   Document Index
    se.index_data('entity', 'HERITAGE_RESOURCE_GROUP.E27', document, id=entityid1)

#   Term index
    print "TERM value, entityid, context: %s,%s,%s" % (value,entityid2,archesmodels.EntityTypes.objects.get(pk = "EAMENA_ID.E42").conceptid_id)
    term = {'term': value, 'entityid': entityid2, 'context': archesmodels.EntityTypes.objects.get(pk = "EAMENA_ID.E42").conceptid_id, 'options': {}}
    se.index_term(term['term'], term['entityid'], term['context'], term['options'])


