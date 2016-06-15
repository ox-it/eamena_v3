    def get_nodes(self, entitytypeid, keys=[]):
        """
        Used by dictify to gather and flatten a single node (by entitytypeid) and all it's children

        for example, a NAME.E41 node with a single child of NAME_TYPE.E55 would be transformed as below
        
        .. code-block:: python

                "NAME_E41": [{
                    "NAME_TYPE_E55__label": "Primary", 
                    "NAME_E41__label": "3264 N WRIGHTWOOD DR"
                }],

        """

        ret = []
        entities = self.find_entities_by_type_id(entitytypeid)
        uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
        for entity in entities:
            data = {}
            prefLabel = {}
            for entity in entity.flatten():
#                 print "entity value: %s" % entity.value
#                 print translation.get_language()

                if isinstance(entity.value, basestring) and uuid_regex.match(entity.value):
                    
                    prefLabel = get_preflabel_from_valueid(entity.value, lang=translation.get_language())

                    for key, value in prefLabel.items():
                        if key == 'value':
                            entity.label = value
                else:
                    return False
                data = dict(data.items() + entity.encode(keys=keys).items())

                
                
            ret.append(data)
        return ret
