FROM registry.oucs.ox.ac.uk/oucs/arches

# RUN usermod -u 1000 mysql

# Overwrite core arches code
# ADD ./arches /custom-arches

# Add eamena code
# ADD ./manage.py /web_root/arches/eamena/manage.py
ADD ./eamena /web_root/arches/eamena/eamena



RUN /web_root/ENV/bin/pip install -r /web_root/arches/arches/install/requirements_dev.txt

# Don't want this arches v4 source code lingering
RUN rm -rf /web_root/arches/arches

# Replace the arches dependency with our own arches code
# ADD ./arches /arches_eamena
RUN /web_root/ENV/bin/pip uninstall -y arches
RUN echo "Uninstalled arches"
# RUN /web_root/ENV/bin/pip install /arches_eamena

RUN . /web_root/ENV/bin/activate

ADD ./eamena/requirements.txt /web_root/arches/eamena/requirements.txt
RUN /web_root/ENV/bin/pip install -r /web_root/arches/eamena/requirements.txt
# 
# ADD ./arches /web_root/ENV/lib/python2.7/site-packages/arches

# Install wkhtmltopdf
# RUN apt-get update && apt-get install build-essential xorg libssl-dev -y && \
RUN apt-get update && apt-get install xvfb -y
RUN wget https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.4/wkhtmltox-0.12.4_linux-generic-amd64.tar.xz && \
tar xf wkhtmltox-0.12.4_linux-generic-amd64.tar.xz && \
chown root:root wkhtmltox/bin/wkhtmltopdf && \
cp wkhtmltox/bin/wkhtmltopdf /usr/local/bin/wkhtmltopdf

# put the runner script in /usr/local/bin
ADD ./scripts/runwkhtmltopdf.sh /usr/local/bin/runwkhtmltopdf.sh
RUN chmod a+x /usr/local/bin/runwkhtmltopdf.sh

# Use our own modified entrypoint script
COPY  ./scripts/entrypoint.sh /docker/entrypoint.sh
RUN chown root:root /docker/entrypoint.sh
RUN chmod 700 /docker/entrypoint.sh





