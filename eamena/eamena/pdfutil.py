import cStringIO as StringIO
from django.template.loader import get_template
from django.template import Context, RequestContext
from wkhtmltopdf.views import PDFTemplateView, PDFTemplateResponse
import logging

def render_to_pdf(template_src, context_dict):
    template = get_template(template_src)
    context = Context(context_dict)
    
    response = PDFTemplateResponse(
        request=None,
        template=template,
        filename='report.pdf',
        context=context,
        cmd_options={'javascript-delay':5000}       # allow time for all images to load before taking snapshot
    )
    
    return response

