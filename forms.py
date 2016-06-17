# This method dynamically modifies the labels of the nodes retrieved upon loading a a form according to the language selected by the user

import re
import uuid
from django.utils import translation
from arches.app.views.concept import get_preflabel_from_valueid
from arches.app.models.entity import Entity
from django.utils.translation import ugettext as _

    def get_nodes(self, entitytypeid):

        #return self.resource.get_nodes(entitytypeid, keys=['label', 'value', 'entityid', 'entitytypeid'])
        ret = []
        prefLabel  = {}
        entities = self.resource.find_entities_by_type_id(entitytypeid)
        uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
        for entity in entities:
            
            flattened = []
            # Iterates through every branch (with its child nodes) to substitute the default label to the desired prefLabel
            for flattenedvalue in entity.flatten():
                # Makes sure that only the visualisation of concepts is altered: free text and geometric data are not
                if isinstance(flattenedvalue.value, basestring) and uuid_regex.match(flattenedvalue.value):
                    # Retrieves the concept label in the correct language
                    prefLabel = get_preflabel_from_valueid(flattenedvalue.value, lang=translation.get_language())
                    flattenedvalue.label = prefLabel['value']

                flattened.append(flattenedvalue)
            
            ret.append({'nodes': flattened})

        return ret
