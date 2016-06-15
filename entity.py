    def get_nodes(self, entitytypeid, keys=[]):

        ret = []
        entities = self.find_entities_by_type_id(entitytypeid)
        uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
        for entity in entities:
            data = {}

            for entity in entity.flatten():
                print "Entity label pre prefLabel: %s" % entity
                if isinstance(entity.value, basestring) and uuid_regex.match(entity.value):
                    print "Entity label post prefLabel: %s" % get_preflabel_from_valueid(entity.value, lang=translation.get_language())
                else:
                    return False

                data = dict(data.items() + entity.encode(keys=keys).items())

                
            ret.append(data)
        return ret
