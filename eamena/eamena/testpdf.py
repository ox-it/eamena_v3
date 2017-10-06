import cStringIO as StringIO
from django.template.loader import get_template
from django.template import Context, RequestContext

from wkhtmltopdf.views import PDFTemplateView, PDFTemplateResponse


# class MyPDF(PDFTemplateView):
#     filename = 'report.pdf'
#     template_name = 'resource-report.htm'

def render_to_pdf(template_src, context_dict):
    template = get_template(template_src)
    context = Context(context_dict)
    # html = template.render(context)
    # result = StringIO.StringIO()
    
    # pdf = pisa.pisaDocument(StringIO.StringIO(html.encode("ISO-8859-1")), result)
    # if not pdf.err:
    #     return HttpResponse(result.getValue(), content_type='application/pdf')
    # return HttpResponse('We had some errors<pre>%s</pre> % escape(html)')
    
    response = PDFTemplateResponse(
        request=None,
        template=template,
        filename='report.pdf',
        context=context,
        cmd_options={'javascript-delay':2000}
    )
    
    return response