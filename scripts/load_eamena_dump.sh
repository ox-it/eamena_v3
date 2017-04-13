#!/bin/sh

createdb -U postgres arches_eamena
pg_restore -U postgres -d arches_eamena /eamena-data/3Mar2017.sql