import os
import inspect
from arches_hip.settings import *
from django.utils.translation import ugettext as _

PACKAGE_ROOT = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
PACKAGE_NAME = PACKAGE_ROOT.split(os.sep)[-1]
DATABASES['default']['NAME'] = 'arches_%s' % (PACKAGE_NAME)
DATABASES['default']['POSTGIS_TEMPLATE'] = 'template_postgis_20'
ROOT_URLCONF = '%s.urls' % (PACKAGE_NAME)
INSTALLED_APPS = INSTALLED_APPS + (PACKAGE_NAME, 'south', 'storages')
STATICFILES_DIRS = (os.path.join(PACKAGE_ROOT, 'media'),) + STATICFILES_DIRS
TEMPLATE_DIRS = (os.path.join(PACKAGE_ROOT, 'templates'),os.path.join(PACKAGE_ROOT, 'templatetags')) + TEMPLATE_DIRS
LOCALE_PATHS = (os.path.join(PACKAGE_ROOT, '../locale'),)
GDAL_LIBRARY_PATH = '/usr/lib/libgdal.so' 
# Absolute filesystem path to the directory that will hold user-uploaded files.
# MEDIA_ROOT =  os.path.join(PACKAGE_ROOT, 'uploadedfiles')

ugettext = lambda s: s
LANGUAGES = (
    ('en-US', ugettext('English')),
    ('ar', ugettext('Arabic')), #Your second language
    ('ckb', ugettext('Sorani')) #Your third language
)
LANGUAGE_CODE = 'en-US' #Your default language
USE_L10N = True

RESOURCE_MODEL = {'default': 'eamena.models.resource.Resource'}

BING_KEY=''




#Below are the Amazon S3 Bitbucket credentials
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = ''
AWS_ACCESS_KEY_ID = ''
AWS_SECRET_ACCESS_KEY = ''
S3_URL = 'https://%s.s3.amazonaws.com/' % AWS_STORAGE_BUCKET_NAME
AWS_S3_REGION_NAME = 'eu-west-2'
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False
MEDIA_URL = S3_URL

DEFAULT_MAP_X = 3000000
DEFAULT_MAP_Y = 2200000
DEFAULT_MAP_ZOOM = 4
MAP_MAX_ZOOM = 19
MAP_MAX_UNLOGGED_ZOOM = 10 # This is the max level of zoom for anonymous users
REPORT_MIN_UNLOGGED_ZOOM = 17
ENCODING_KEY =''

# DEFAULT_MAP_X = -13179347.3099
# DEFAULT_MAP_Y = 4031285.8349
# DEFAULT_MAP_ZOOM = 1
# MAP_MIN_ZOOM = 9
# MAP_MAX_ZOOM = 19
# MAP_EXTENT = '-13228037.69691764,3981296.0184014924,-13123624.71628009,4080358.407059081'

EAMENA_RESOURCES = ['HERITAGE_RESOURCE_GROUP.E27'] #Specify which resource types should take on the identifier EAMENA-. All other resource types will take on an identifier beginning with their truncated EntityType, e.g. ACTOR for ACTOR.E39, INFORMATION for INFORMATION_RESOURCE.E73
ID_LENGTH = 7 #Indicates the length of the Unique Resource IDs after the set tag, e.g. 7 -> EAMENA-0000001. MUST BE GIVEN, AND BE 2 OR OVER.

# DATE_SEARCH_ENTITY_TYPES = ['BEGINNING_OF_EXISTENCE_TYPE.E55', 'END_OF_EXISTENCE_TYPE.E55', 'DISTURBANCE_DATE_TYPE.E55']

def RESOURCE_TYPE_CONFIGS():
    return {
#         'HERITAGE_RESOURCE.E18': {
#             'resourcetypeid': 'HERITAGE_RESOURCE.E18',
#             'name': _('Heritage Resource E18 Feature'),
#             'icon_class': 'fa fa-university',
#             'default_page': 'summary',
#             'default_description': _('No name available'),
#             'description_node': _('NAME.E41'),
#             'categories': [_('Resource')],
#             'has_layer': True,
#             'on_map': False,
#             'marker_color': '#fa6003',
#             'stroke_color': '#fb8c49',
#             'fill_color': '#ffc29e',
#             'primary_name_lookup': {
#                 'entity_type': 'SITE_ID.E42',
#                 'lookup_value': 'Primary'
#             },
#             'sort_order': 2
#         },
        'HERITAGE_RESOURCE_GROUP.E27': {
            'resourcetypeid': 'HERITAGE_RESOURCE_GROUP.E27',
            'name': _('Heritage Resource E27'),
            'icon_class': 'fa fa-th',
            'default_page': 'summary',
            'default_description': _('No name available'),
            'description_node': _('NAME.E41'),
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': False,
            'marker_color': '#FFC53D',
            'stroke_color': '#d9b562',
            'fill_color': '#eedbad',
            'primary_name_lookup': {
                'entity_type': 'EAMENA_ID.E42',
                'lookup_value': 'Primary'
            },
            'sort_order': 1
        },
#         'ACTIVITY.E7': {
#             'resourcetypeid': 'ACTIVITY.E7',
#             'name': _('Activity'),
#             'icon_class': 'fa fa-tasks',
#             'default_page': 'activity-summary',
#             'default_description': _('No description available'),
#             'description_node': _('INSERT RESOURCE DESCRIPTION NODE HERE'),
#             'categories': [_('Resource')],
#             'has_layer': True,
#             'on_map': False,
#             'marker_color': '#6DC3FC',
#             'stroke_color': '#88bde0',
#             'fill_color': '#afcce1',
#             'primary_name_lookup': {
#                 'entity_type': 'NAME.E41',
#                 'lookup_value': 'Primary'
#             },
#             'sort_order': 3
#         },
#         'HISTORICAL_EVENT.E5':{
#             'resourcetypeid': 'HISTORICAL_EVENT.E5',
#             'name': _('Historic Event'),
#             'icon_class': 'fa fa-calendar',
#             'default_page': 'historical-event-summary',
#             'default_description': _('No description available'),
#             'description_node': _('INSERT RESOURCE DESCRIPTION NODE HERE'),
#             'categories': [_('Resource')],
#             'has_layer': True,
#             'on_map': False,
#             'marker_color': '#4EBF41',
#             'stroke_color': '#61a659',
#             'fill_color': '#c2d8bf',
#             'primary_name_lookup': {
#                 'entity_type': 'NAME.E41',
#                 'lookup_value': 'Primary'
#             },
#             'sort_order': 4
#         },
        'ACTOR.E39': {
            'resourcetypeid': 'ACTOR.E39',
            'name': _('Person/Organization'),
            'icon_class': 'fa fa-group',
            'default_page': 'actor-summary',
            'default_description': _('No description available'),
            'description_node': _('ACTOR_APPELLATION.E82'),
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': False,
            'marker_color': '#a44b0f',
            'stroke_color': '#a7673d',
            'fill_color': '#c8b2a3',
            'primary_name_lookup': {
                'entity_type': 'EAMENA_ID.E42',
                'lookup_value': 'Primary'
            },
            'sort_order': 5
        },
        'INFORMATION_RESOURCE.E73': {
            'resourcetypeid': 'INFORMATION_RESOURCE.E73',
            'name': _('Information Resource'),
            'icon_class': 'fa fa-file-text-o',
            'default_page': 'information-resource-summary',
            'default_description': _('No description available'),
            'description_node': _('TITLE.E41,CATALOGUE_ID.E42,IMAGERY_CREATOR_APPELLATION.E82,TILE_SQUARE_DETAILS.E44,CONTRIBUTOR_APPELLATION.E82,SHARED_DATA_SOURCE_APPELLATION.E82,SHARED_DATA_SOURCE_AFFILIATION.E82,SHARED_DATA_SOURCE_CREATOR_APPELLATION.E82'),
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': False,
            'marker_color': '#8D45F8',
            'stroke_color': '#9367d5',
            'fill_color': '#c3b5d8',
            'primary_name_lookup': {
                'entity_type': 'EAMENA_ID.E42',
                'lookup_value': 'Primary'
            },
            'sort_order': 6
        }
    }

#Limit number of items per Search page
SEARCH_ITEMS_PER_PAGE= 20

#GEOCODING_PROVIDER = ''

RESOURCE_GRAPH_LOCATIONS = (
#     # Put strings here, like "/home/data/resource_graphs" or "C:/data/resource_graphs".
#     # Always use forward slashes, even on Windows.
#     # Don't forget to use absolute paths, not relative paths.
     os.path.join(PACKAGE_ROOT, 'source_data', 'resource_graphs'),
)



CONCEPT_SCHEME_LOCATIONS = (
    # Put strings here, like "/home/data/authority_files" or "C:/data/authority_files".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    
    #'absolute/path/to/authority_files',
    os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'concepts', 'authority_files')),
)

BUSISNESS_DATA_FILES = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'business_data', 'sample.arches')),
)

APP_NAME = 'eamena'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(PACKAGE_ROOT, 'logs', 'application.txt'),
        },
    },
    'loggers': {
        'arches': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'eamena': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        }
    },
}



EXPORT_CONFIG = os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'business_data', 'resource_export_mappings.json'))

try:
    from settings_local import *
except ImportError:
    pass
