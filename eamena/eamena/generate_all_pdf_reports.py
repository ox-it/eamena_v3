import arches.app.models.models as archesmodels
from eamena.models.resource import Resource
import logging

def generate_all_pdf_reports(ids=None):
    
    logging.warning("GENERATING PDF REPORTS")
    
    # get all relevant resources
    resources = archesmodels.Entities.objects.filter(entitytypeid = "HERITAGE_RESOURCE_GROUP.E27");
    
    logging.warning("Found %s resources", len(resources))
    
    for heritage_resource in resources:
        res = Resource().get(heritage_resource.entityid)
        res.save_pdf()