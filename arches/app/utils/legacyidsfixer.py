import csv
from arches.app.models.models import Concepts


def LegacyIdsFixer(source):
    """
    Simple utility to replace unintelligible LegacyOIDs in uuid format with human readable ones.
    AZ 24/11/16
    """

    with open(source, 'rb') as csvfile:
        reader = csv.DictReader(csvfile, delimiter= '|')
        for row in reader:
            try:
                concept = Concepts.objects.get(legacyoid = str(row['oldlegacy']))
            except:
                print "Concept %s could not be assigned value %s" % (row['oldlegacy'],row['newlegacy'])
            concept.legacyoid = row['newlegacy']
            concept.save()