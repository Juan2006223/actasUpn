export const actaPrintStyles = `
@page { size: letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; }
body { font: 14px/1.35 Arial, sans-serif; color: black; }
.acta-sheet { position: relative; width: 215.9mm; height: 279.4mm; padding: 10mm 15mm 18mm; break-after: page; page-break-after: always; }
.acta-sheet:last-child { break-after: auto; page-break-after: auto; }
.acta-header { margin-bottom: 6mm; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid black; }
td, th { border: 1px solid black; padding: 4px 6px; vertical-align: top; overflow-wrap: anywhere; }
.acta-content > table { outline: 1px solid black; outline-offset: 3px; margin: 3px; width: calc(100% - 6px); }
.acta-header td { padding: 3px 5px; }
.acta-header table { margin: 0; }
.acta-header img { display: block; }
.acta-header td.p-0 { padding: 3px 5px; }
.sec { background: #bfbfbf; font-weight: bold; padding: 4px 6px; border: 1px solid black; margin-top: 6px; }
.hdr { background: #bfbfbf; font-weight: bold; }
.meta { font-weight: bold; text-align: center; }
.text-center { text-align: center; }
.font-bold { font-weight: bold; }
.align-middle { vertical-align: middle; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.my-2 { margin-top: 8px; margin-bottom: 8px; }
.mb-2 { margin-bottom: 8px; }
.mt-3 { margin-top: 12px; }
.border { border: 1px solid black; }
.px-2 { padding-left: 8px; padding-right: 8px; }
[class~="text-[10px]"] { font-size: 10px; }
p { margin: 0; }
.acta-footer { position: absolute; bottom: 8mm; right: 15mm; font-size: 10px; }
img { max-width: 100%; }
* { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
`;

export const ACTA_PRINT_CSS = actaPrintStyles;

export function paginateActa(source, doc) {
    const headerTemplate = source.querySelector('.print-running-header').cloneNode(true);
    headerTemplate.className = 'acta-header';
    const blocks = [...source.children].filter(el => el.tagName !== 'STYLE'
        && !el.classList.contains('screen-header') && !el.classList.contains('print-running-header'));
    const pages = [];
    let sheet, content, limit;
    let pendingHeading = null;
    const newPage = () => {
        sheet = doc.createElement('section');
        sheet.className = 'acta-sheet';
        sheet.append(headerTemplate.cloneNode(true));
        content = doc.createElement('div');
        content.className = 'acta-content';
        sheet.append(content);
        doc.body.append(sheet);
        pages.push(sheet);
        limit = sheet.getBoundingClientRect().bottom - 18 * 96 / 25.4;
    };
    const fits = el => el.getBoundingClientRect().bottom + 4 <= limit;
    newPage();

    for (const block of blocks) {
        if (block.classList.contains('sec')) {
            pendingHeading = block.cloneNode(true);
            continue;
        }
        if (block.tagName !== 'TABLE') {
            const item = block.cloneNode(true);
            content.append(item);
            if (!fits(item)) {
                item.remove();
                newPage();
                content.append(item);
                if (!fits(item)) throw new Error('Un bloque del acta supera el espacio de una hoja.');
            }
            continue;
        }

        let table, body, heading;
        const openTable = () => {
            heading = pendingHeading;
            if (heading) content.append(heading);
            table = block.cloneNode(false);
            for (const child of block.children) {
                if (['COLGROUP', 'THEAD'].includes(child.tagName)) table.append(child.cloneNode(true));
            }
            body = doc.createElement('tbody');
            table.append(body);
            content.append(table);
        };
        const continueTable = () => {
            if (!body.rows.length) {
                table.remove();
                heading?.remove();
            } else {
                pendingHeading = null;
            }
            newPage();
            openTable();
        };
        openTable();
        const rows = [...block.tBodies].flatMap(tbody => [...tbody.rows]);
        for (const originalRow of rows) {
            const row = originalRow.cloneNode(true);
            body.append(row);
            if (fits(table)) continue;
            row.remove();

            const textCell = row.cells.length === 1 && row.cells[0].classList.contains('whitespace-pre-wrap');
            if (textCell) {
                let tokens = row.cells[0].textContent.match(/\S+\s*|\s+/g) || [''];
                while (tokens.length) {
                    const fragment = originalRow.cloneNode(true);
                    body.append(fragment);
                    let low = 0, high = tokens.length;
                    while (low < high) {
                        const mid = Math.ceil((low + high) / 2);
                        fragment.cells[0].textContent = tokens.slice(0, mid).join('');
                        if (fits(table)) low = mid;
                        else high = mid - 1;
                    }
                    if (!low) {
                        fragment.remove();
                        const emptySheet = !body.rows.length && content.children.length <= (heading ? 2 : 1);
                        if (emptySheet) throw new Error('El texto no cabe dentro de los margenes del acta.');
                        continueTable();
                        continue;
                    }
                    fragment.cells[0].textContent = tokens.splice(0, low).join('');
                    if (tokens.length) continueTable();
                }
            } else {
                continueTable();
                body.append(row);
                if (!fits(table)) throw new Error('Una fila del acta supera el espacio de una hoja.');
            }
        }
        if (!rows.length && !fits(table)) continueTable();
        pendingHeading = null;
    }

    pages.forEach((page, index) => {
        const number = `${index + 1} de ${pages.length}`;
        const label = page.querySelector('.page-label');
        if (label) label.textContent = number;
        const footer = doc.createElement('div');
        footer.className = 'acta-footer';
        footer.textContent = `P\u00e1gina ${number}`;
        page.append(footer);
    });
    return pages;
}
