# Using docker for the eamena project

## 1. Set VM ram to 2GB
Elasticsearch and the large amount of data mean that at least 2GB ram is needed, whereas the virtualbox default is 1GB.

To do this, stop the machine with ```docker-machine stop default```, then open the virtualbox Application and edit the 'default' VM's settings.

## 2. Copy the data files to the working directory
Extract the Archive.

Place the sql file in ```PROJECT/data/sql/```
Place the extracted elasticsearch folder in ```PROJECT/data/elasticsearch/``` (the folder structure should now be /data/elasticsearch/elasticsearch-1.4.1/....)


## 3. Configure eamena/settings.py
Some settings need to be modified:
* BING_KEY = ```take from settings.py in the archive dump```
* GDAL_LIBRARY_PATH = '/usr/lib/libgdal.so'

## 4. Start the containers
```
docker-compose up
```
This will take some time

## 5. Import the sql data
A script will automatically run to import the data placed in /data/sql/3Mar2017.sql
On first run, the container will quit after the import, so it will be necessary to restart this container after this happens:
```
docker start eamena_psql
```

## 6. Import the elasticsearch data
enter the elasticsearch contaienr:
```
docker exec -it eamenav3_elasticsearch_1 /bin/bash
```
Copy the archived files over everything else
```
bash /eamena-scripts/init_es_data.sh
```

## 7. Create a user
log into the eamena_arches container and run
```
cd /web_root/arches/eamena
/web_root/ENV/bin/python/ manage.py createsuperuser
```

Then add the created user to the 'edit' group via the django admin dashboard at ```http://docker.default:800/admin```

## 8. Start using the app
navigate to ```http://docker.default:8000``` (substitute your own hostname, or the ip address of your docker machine)

Elasticsearch can be browsed at ```http://docker.default:9200/_plugin/head```

### Importing the smaller data set
log into the arches container then run 
```
. /web_root/ENV/bin/activate
cd /web_root/arches/eamena
python manage.py packages -o remove_resources
python manage.py packages -o load_resources /web_root/EAMENA_Data.json
```