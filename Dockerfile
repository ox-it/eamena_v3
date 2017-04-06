FROM arches/arches

# RUN usermod -u 1000 mysql

# Overwrite core arches code
# ADD ./arches /custom-arches

# Add eamena code
ADD ./manage.py /web_root/arches/eamena/manage.py
ADD ./eamena /web_root/arches/eamena/eamena


# Use our own modified entrypoint script
COPY  ./scripts/entrypoint.sh /docker/entrypoint.sh
RUN chown root:root /docker/entrypoint.sh
RUN chmod 700 /docker/entrypoint.sh


RUN /web_root/ENV/bin/pip install -r /web_root/arches/arches/install/requirements_dev.txt

# Replace the arches dependency with our own arches code
ADD ./arches /arches_eamena
RUN /web_root/ENV/bin/pip uninstall -y arches
RUN echo "Uninstalled arches"
# RUN /web_root/ENV/bin/pip install /arches_eamena

ADD ./requirements.txt /web_root/arches/eamena/requirements.txt
RUN /web_root/ENV/bin/pip install -r /web_root/arches/eamena/requirements.txt
# 
# ADD ./arches /web_root/ENV/lib/python2.7/site-packages/arches