from django.db import migrations, models


def a_partes(apps, schema_editor):
    """Cada procesamiento anterior tenía un solo archivo o texto: pasa a ser su única parte."""
    Modelo = apps.get_model('transcripcion', 'ProcesamientoGrabacion')
    for m in Modelo.objects.all():
        if m.texto_pegado or m.nombre_archivo == 'Transcripción pegada':
            parte = {'tipo': 'texto', 'nombre': 'Parte 1', 'tamano': 0, 'recibido': 0, 'ruta': '', 'texto': m.texto_pegado}
        else:
            parte = {'tipo': 'audio', 'nombre': m.nombre_archivo, 'tamano': m.tamano_bytes,
                     'recibido': m.recibido_bytes, 'ruta': m.ruta_audio, 'texto': ''}
        m.partes = [parte]
        m.save(update_fields=['partes'])


class Migration(migrations.Migration):

    dependencies = [
        ('transcripcion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='procesamientograbacion',
            name='partes',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(a_partes, migrations.RunPython.noop),
        migrations.RemoveField(model_name='procesamientograbacion', name='nombre_archivo'),
        migrations.RemoveField(model_name='procesamientograbacion', name='tamano_bytes'),
        migrations.RemoveField(model_name='procesamientograbacion', name='recibido_bytes'),
        migrations.RemoveField(model_name='procesamientograbacion', name='ruta_audio'),
        migrations.RemoveField(model_name='procesamientograbacion', name='texto_pegado'),
    ]
