#!/bin/bash
# Run wkhtmltopdf via xvfb so that a frame buffer is available within docker.
xvfb-run -a -s "-screen 0 640x480x16" wkhtmltopdf "$@"