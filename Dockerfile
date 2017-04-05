FROM arches/arches

# Overwrite core arches code
ADD ./arches /custom-arches

# Add eamena code
ADD ./manage.py /web_root/arches/eamena/manage.py
ADD ./eamena /web_root/arches/eamena/eamena

COPY  ./entrypoint.sh /docker/entrypoint.sh
RUN chown root:root /docker/entrypoint.sh
RUN chmod 700 /docker/entrypoint.sh

ADD ./requirements.txt /web_root/arches/eamena/requirements.txt

RUN pip install -r /web_root/arches/arches/install/requirements_dev.txt
# RUN pip install -r /web_root/arches/eamena/requirements.txt
# 
# ADD ./arches /web_root/ENV/lib/python2.7/site-packages/arches