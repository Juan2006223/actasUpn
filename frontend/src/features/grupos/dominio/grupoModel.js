export function crearGrupoBorrador() {
    return {
        name: '',
        date: '',
        description: '',
        features: '',
        advisor_id: '',
        advisor_name: '',
    };
}

export function validarGrupo(form) {
    if (!form?.name || !String(form.name).trim()) {
        throw new Error('El nombre de la cohorte es obligatorio.');
    }
    if (!form?.date || !String(form.date).trim()) {
        throw new Error('La fecha de inicio es obligatoria.');
    }
    return {
        ...form,
        name: String(form.name).trim(),
        date: String(form.date).trim(),
    };
}

export function paginarGrupos(grupos = [], page = 1, perPage = 10) {
    const totalPages = Math.max(1, Math.ceil(grupos.length / perPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const pageData = grupos.slice((currentPage - 1) * perPage, currentPage * perPage);
    return { totalPages, currentPage, pageData };
}

export function resolverNombreAsesor(grupo, teachers = []) {
    const asesor = teachers.find(t => String(t.id) === String(grupo.advisor_id));
    if (asesor) {
        return `${asesor.first_name || ''} ${asesor.last_name || ''}`.trim() || asesor.username;
    }
    return grupo.advisor_name || '';
}
