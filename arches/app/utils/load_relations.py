import csv
from arches.app.utils.data_management.resources.importer import ResourceLoader 

def LoadRelations(source):
    """
    Simple utility to load relations without having an arches file
    
    AZ 14/12/16
    """

    with open(source, 'rb') as csvfile:
        reader = csv.DictReader(csvfile, delimiter= ',')
        for row in reader:
            try:
                ResourceLoader().relate_resources(row, legacyid_to_entityid = None, archesjson = True)
            except:
                print "Issue with entity1 %s and entity2 %s" %(row['RESOURCEID_FROM'], row['RESOURCEID_TO'])