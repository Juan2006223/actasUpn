from django.core.management.base import BaseCommand

from ... import trabajador


class Command(BaseCommand):
    help = 'Procesa las grabaciones en cola (transcripción, hablantes y redacción del acta).'

    def add_arguments(self, parser):
        parser.add_argument('--una-vez', action='store_true', help='Procesa lo pendiente y termina.')

    def handle(self, *args, **opciones):
        if opciones['una_vez']:
            hechos = trabajador.procesar_pendientes()
            self.stdout.write(self.style.SUCCESS(f'Procesadas: {hechos}'))
            return
        self.stdout.write('Esperando grabaciones… (Ctrl+C para salir)')
        trabajador.bucle()
