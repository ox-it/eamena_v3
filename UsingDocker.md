# Using docker for the eamena project

# 1. Set VM ram to 2GB
Elasticsearch and the large amount of data mean that at least 2GB ram is needed, whereas the virtualbox default is 1GB.

To do this, stop the machine with ```docker-machine stop default```, then open the virtualbox Application and edit the 'default' VM's settings.

# 2. Copy the data files to the working directory
Take the Archive and place it in the project directory at ```/data/```

# 3. Start the containers
```
docker-compose up
```
This will take some time

# 4. Import the sql data
First enter a shell inside the sql container
```
docker exec -it eamenav3_psql_1 /bin/bash
```
Then restore the dump:
```
pg_restore -U postgres -d arches_eamena /eamena-data/dump.sql
```
This will take several minutes as there is a large amount of data

# 5. Import the elasticsearch data
enter the elasticsearch contaienr:
```
docker exec -it eamenav3_elasticsearch_1 /bin/bash
```
Copy the archived files over everything else
```
cp -r /eamena-data/* .
```

# 6. Create a user
enter the arches (python) container
```
docker exec -it eamenav3_arches_1 /bin/bash
```
Create a superuser
```
../ENV/bin/python eamena/manage.py createsuperuser
```

Now make your user part of the 'edit' group via the django admin dashboard at ```http://docker.default:800/admin```

# 7. Configure eamena/settings.py
Some settings need to be taken from the archive dump:
* BING_KEY

# 7. Start using the app
navigate to ```http://docker.default:8000``` (substitute your own hostname, or the ip address of your docker machine)

Elasticsearch can be browsed at ```http://docker.default:9200/_plugin/head```