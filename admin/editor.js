/* The Lonah Maiko Foundation — on-page site editor.
   Loaded by js/main.js only for a logged-in editor on edit.thelonahmaikofoundation.com.
   Edits text, photos, sections, pages and menus, then publishes them as one commit
   (content files only, so publishing never triggers a Netlify deploy). */
(function () {
    'use strict';
    if (window.__lmfEditor) return; window.__lmfEditor = true;

    var TOKEN = localStorage.getItem('lmfEditToken');
    var NAME = localStorage.getItem('lmfEditName') || 'Editor';
    var FILES = ['data/text.json', 'data/images.json', 'data/sections.json', 'data/pages.json', 'data/menu.json'];
    var state = {}, dirty = {}, changes = 0;
    var here = location.pathname.split('/').pop() || 'index.html';
    var pageKey = here === 'page.html' ? 'page.html?p=' + (new URLSearchParams(location.search).get('p') || '') : here;

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
    function mark(file) { dirty[file] = true; changes++; updateBar(); }
    function api(path, body) {
        return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store',
            headers: Object.assign({ Authorization: 'Bearer ' + TOKEN }, body ? { 'Content-Type': 'application/json' } : {}),
            body: body ? JSON.stringify(body) : undefined })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
                if (r.status === 401) { logout(); throw new Error('Your login expired. Please log in again.'); }
                if (!r.ok) throw new Error(j.error || ('Error ' + r.status)); return j; }); });
    }
    function logout() { localStorage.removeItem('lmfEditToken'); location.href = '/admin/'; }

    /* ---------- styles ---------- */
    var css = document.createElement('style');
    css.textContent = [
        'body.lmf-editing{padding-top:58px!important}',
        'body.lmf-editing .lmf-clamp{-webkit-line-clamp:unset!important;display:block!important;overflow:visible!important}',
        'body.lmf-editing .lmf-more,body.lmf-editing .lmf-more-link{display:none!important}',
        '.lmf-bar{position:fixed;top:0;left:0;right:0;z-index:10000;background:#071C27;color:#fff;display:flex;align-items:center;gap:8px;padding:8px 12px;font:600 14px Montserrat,Arial,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.35);flex-wrap:wrap}',
        '.lmf-bar .lmf-title{margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40vw}',
        '.lmf-bar button,.lmf-modal button{font:700 13px Montserrat,Arial,sans-serif;border:0;border-radius:7px;padding:9px 12px;cursor:pointer;background:#173b4d;color:#fff;min-height:38px}',
        '.lmf-bar button.lmf-primary,.lmf-modal button.lmf-primary{background:#19E3EE;color:#0A2F3F}',
        '.lmf-bar button:disabled{opacity:.5;cursor:default}',
        '[data-text].lmf-on{outline:2px dashed rgba(0,122,135,.55);outline-offset:3px;cursor:text;border-radius:3px}',
        '[data-text].lmf-on:hover,[data-text].lmf-on:focus{outline:2px solid #19E3EE;background:rgba(25,227,238,.08)}',
        '.lmf-imgwrap{position:relative}',
        '.lmf-imgbtn{position:absolute;z-index:50;background:#19E3EE;color:#0A2F3F;font:800 12px Montserrat,Arial,sans-serif;border:0;border-radius:6px;padding:7px 10px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
        '.lmf-secctl{position:absolute;top:8px;right:8px;z-index:60;display:flex;gap:6px}',
        '.lmf-secctl button{font:700 12px Montserrat,Arial,sans-serif;border:0;border-radius:6px;padding:7px 10px;cursor:pointer;background:#0A2F3F;color:#fff}',
        '.lmf-secctl button.lmf-del{background:#b42318}',
        '[data-sec-index]{position:relative;outline:2px dashed rgba(25,227,238,.6);outline-offset:6px}',
        '.lmf-modal-bg{position:fixed;inset:0;z-index:10001;background:rgba(7,28,39,.6);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto}',
        '.lmf-modal{background:#fff;color:#0F2430;width:100%;max-width:640px;border-radius:14px;padding:20px 20px 16px;font:15px Montserrat,Arial,sans-serif;margin:auto 0}',
        '.lmf-modal h3{margin:0 0 14px;color:#0A2F3F;font-size:1.15rem}',
        '.lmf-modal label{display:block;font-weight:700;font-size:13px;margin:12px 0 5px}',
        '.lmf-modal input[type=text],.lmf-modal select,.lmf-modal textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfd9e2;border-radius:7px;font:16px Montserrat,Arial,sans-serif}',
        '.lmf-modal .lmf-hint{font-size:12px;color:#5b6b78;margin-top:4px}',
        '.lmf-rich-tools{display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap}',
        '.lmf-rich-tools button{background:#eef3f6;color:#0A2F3F;min-height:32px;padding:6px 10px}',
        '.lmf-rich{min-height:140px;border:1px solid #cfd9e2;border-radius:7px;padding:10px 12px;line-height:1.6;max-height:50vh;overflow:auto}',
        '.lmf-rich:focus{outline:3px solid #19E3EE}',
        '.lmf-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}',
        '.lmf-menu-row{display:grid;grid-template-columns:1fr 1.2fr auto;gap:6px;align-items:center;margin-bottom:6px}',
        '.lmf-menu-row .lmf-rowbtns{display:flex;gap:3px}',
        '.lmf-menu-row .lmf-rowbtns button{padding:6px 8px;min-height:32px;background:#eef3f6;color:#0A2F3F}',
        '.lmf-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10002;background:#0A2F3F;color:#fff;padding:12px 18px;border-radius:10px;font:600 14px Montserrat,Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:90vw;text-align:center}',
        '.lmf-toast.lmf-bad{background:#b42318}',
        '.lmf-photo-prev{max-width:100%;max-height:160px;border-radius:8px;margin-top:6px;display:block}',
        '@media(max-width:600px){.lmf-bar .lmf-title{max-width:100%;flex-basis:100%}body.lmf-editing{padding-top:100px!important}}'
    ].join('\n');
    document.head.appendChild(css);

    function toast(msg, bad, ms) {
        var t = document.createElement('div'); t.className = 'lmf-toast' + (bad ? ' lmf-bad' : ''); t.textContent = msg;
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 3500);
    }

    /* ---------- toolbar ---------- */
    var bar, pubBtn;
    function buildBar() {
        document.body.classList.add('lmf-editing');
        bar = document.createElement('div'); bar.className = 'lmf-bar';
        bar.innerHTML = '<span class="lmf-title">✏️ Editing: ' + esc(document.title.split('|')[0].split(' - ')[0]) + '</span>';
        var addSec = btn('＋ Add section', openSection);
        var newPg = btn('＋ New page', function () { openPage(); });
        var menu = btn('☰ Edit menu', openMenu);
        bar.appendChild(addSec); bar.appendChild(newPg); bar.appendChild(menu);
        if (here === 'page.html') bar.appendChild(btn('Edit this page', function () { openPage(findPage()); }));
        pubBtn = btn('Publish', publish); pubBtn.className = 'lmf-primary';
        bar.appendChild(pubBtn);
        bar.appendChild(btn('Log out', function () { if (!changes || confirmLeave()) logout(); }));
        document.body.appendChild(bar);
        updateBar();
    }
    function btn(label, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); return b; }
    function updateBar() { if (pubBtn) { pubBtn.disabled = !changes; pubBtn.textContent = changes ? 'Publish (' + changes + ')' : 'Publish'; } }
    function confirmLeave() { return window.confirm('You have changes that are not published yet. Leave without publishing?'); }
    window.addEventListener('beforeunload', function (e) { if (changes) { e.preventDefault(); e.returnValue = ''; } });

    /* ---------- text ---------- */
    function enableText() {
        document.querySelectorAll('[data-text]').forEach(function (el) {
            el.classList.add('lmf-on');
            try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
            if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
            el.spellcheck = true;
            // stop clicks inside links/cards from navigating while editing
            el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
            el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !/^(P|LI|BLOCKQUOTE|DIV)$/.test(el.tagName)) e.preventDefault(); });
            el.addEventListener('paste', function (e) {
                e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, t);
            });
            el.addEventListener('input', function () {
                var k = el.getAttribute('data-text').split('.');
                var tj = state['data/text.json'] = state['data/text.json'] || {};
                tj[k[0]] = tj[k[0]] || {};
                tj[k[0]][k[1]] = el.innerText.replace(/\s+/g, ' ').trim();
                // the edited text must win over the hash check on the live site
                el.setAttribute('data-text-src', window.lmfHash ? lmfHash(el.textContent.replace(/\s+/g, ' ').trim()) : '');
                if (!dirty['data/text.json']) mark('data/text.json'); else { changes = Math.max(changes, 1); updateBar(); }
                countText();
            });
        });
        // links that are not text blocks: confirm before leaving the page while there are changes
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href]');
            if (!a || a.closest('.lmf-bar,.lmf-modal-bg')) return;
            if (changes && !confirmLeave()) e.preventDefault();
        });
    }
    var textEdits = 0;
    function countText() { textEdits++; }

    /* ---------- photos ---------- */
    function resizeToJpeg(file, max) {
        return new Promise(function (ok, bad) {
            var img = new Image(), url = URL.createObjectURL(file);
            img.onload = function () {
                var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
                var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                ok(c.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = function () { bad(new Error('That file is not a photo we can use.')); };
            img.src = url;
        });
    }
    function uploadPhoto(file) {
        var name = (file.name || 'photo').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
        var path = 'Images/uploads/' + Date.now() + '-' + name + '.jpg';
        toast('Uploading photo…', false, 2500);
        return resizeToJpeg(file, 1600).then(function (dataUrl) {
            return api('/api/save', { uploads: [{ path: path, base64: dataUrl.split(',')[1] }], message: 'Upload photo ' + path })
                .then(function () { return { path: path, preview: dataUrl }; });
        });
    }
    function pickFile() {
        return new Promise(function (ok) {
            var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
            i.addEventListener('change', function () { ok(i.files && i.files[0]); }); i.click();
        });
    }
    function enableImages() {
        var btnEl = document.createElement('button'); btnEl.className = 'lmf-imgbtn'; btnEl.type = 'button'; btnEl.textContent = '📷 Replace photo'; btnEl.hidden = true;
        document.body.appendChild(btnEl);
        var current = null;
        function place(img) {
            var r = img.getBoundingClientRect(); if (r.width < 40 || r.height < 30) return;
            current = img; btnEl.hidden = false;
            btnEl.style.position = 'absolute';
            btnEl.style.top = (window.scrollY + r.top + 8) + 'px'; btnEl.style.left = (window.scrollX + r.left + 8) + 'px';
        }
        document.querySelectorAll('img[data-img]').forEach(function (img) {
            img.addEventListener('mouseenter', function () { place(img); });
            img.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); place(img); }, true);
        });
        btnEl.addEventListener('click', function () {
            var img = current; if (!img) return;
            pickFile().then(function (f) {
                if (!f) return;
                return uploadPhoto(f).then(function (res) {
                    var k = img.getAttribute('data-img').split('.');
                    var ij = state['data/images.json'] = state['data/images.json'] || {};
                    ij[k[0]] = ij[k[0]] || {}; ij[k[0]][k[1]] = res.path;
                    if (img.parentNode && img.parentNode.tagName === 'PICTURE') img.parentNode.querySelectorAll('source').forEach(function (s) { s.remove(); });
                    img.removeAttribute('srcset'); img.src = res.preview;
                    mark('data/images.json'); toast('Photo replaced. Press Publish to put it live.');
                });
            }).catch(function (e) { toast(e.message, true, 6000); });
        });
    }

    /* ---------- modal helpers ---------- */
    function modal(title, bodyEl, onSave, saveLabel) {
        var bg = document.createElement('div'); bg.className = 'lmf-modal-bg';
        var m = document.createElement('div'); m.className = 'lmf-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        m.innerHTML = '<h3>' + esc(title) + '</h3>'; m.appendChild(bodyEl);
        var act = document.createElement('div'); act.className = 'lmf-actions';
        var cancel = btn('Cancel', close); var save = btn(saveLabel || 'Done', function () { if (onSave() !== false) close(); }); save.className = 'lmf-primary';
        act.appendChild(cancel); act.appendChild(save); m.appendChild(act); bg.appendChild(m);
        bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
        document.body.appendChild(bg); var f = m.querySelector('input,select,textarea,[contenteditable]'); if (f) f.focus();
        function close() { bg.remove(); }
        return close;
    }
    function field(label, el, hint) {
        var w = document.createElement('div'); var l = document.createElement('label'); l.textContent = label; w.appendChild(l); w.appendChild(el);
        if (hint) { var h = document.createElement('div'); h.className = 'lmf-hint'; h.textContent = hint; w.appendChild(h); }
        return w;
    }
    function input(v, ph) { var i = document.createElement('input'); i.type = 'text'; i.value = v || ''; if (ph) i.placeholder = ph; return i; }
    function select(opts, v) { var s = document.createElement('select'); opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (o[0] === v) op.selected = true; s.appendChild(op); }); return s; }
    function richBox(html) {
        var w = document.createElement('div');
        var tools = document.createElement('div'); tools.className = 'lmf-rich-tools';
        var box = document.createElement('div'); box.className = 'lmf-rich'; box.contentEditable = 'true'; box.innerHTML = html || '<p><br></p>';
        [['B', 'bold'], ['I', 'italic'], ['• List', 'insertUnorderedList'], ['1. List', 'insertOrderedList'], ['Heading', 'h3'], ['Normal', 'p']].forEach(function (t) {
            tools.appendChild(btn(t[0], function () { box.focus(); if (t[1] === 'h3' || t[1] === 'p') document.execCommand('formatBlock', false, t[1]); else document.execCommand(t[1]); }));
        });
        tools.appendChild(btn('🔗 Link', function () {
            var u = window.prompt('Link address (e.g. donate.html or https://...)'); if (!u) return;
            box.focus(); document.execCommand('createLink', false, u);
        }));
        tools.appendChild(btn('📷 Photo', function () {
            var sel = window.getSelection(), range = sel.rangeCount ? sel.getRangeAt(0) : null;
            pickFile().then(function (f) { if (!f) return; return uploadPhoto(f).then(function (res) {
                box.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
                document.execCommand('insertHTML', false, '<img src="' + res.path + '" alt="">');
                box.querySelectorAll('img[src="' + res.path + '"]').forEach(function (i) { i.src = res.preview; i.setAttribute('data-src', res.path); });
            }); }).catch(function (e) { toast(e.message, true, 6000); });
        }));
        box.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
        w.appendChild(tools); w.appendChild(box);
        w.getHTML = function () {
            var c = box.cloneNode(true);
            c.querySelectorAll('img[data-src]').forEach(function (i) { i.setAttribute('src', i.getAttribute('data-src')); i.removeAttribute('data-src'); });
            c.querySelectorAll('[style]').forEach(function (n) { n.removeAttribute('style'); });
            c.querySelectorAll('script,iframe,object,embed').forEach(function (n) { n.remove(); });
            var h = c.innerHTML.trim(); return h === '<p><br></p>' ? '' : h;
        };
        return w;
    }
    function photoField(label, value) {
        var w = document.createElement('div'), v = value || '';
        var prev = document.createElement('img'); prev.className = 'lmf-photo-prev'; if (v) prev.src = window.lmfAsset ? lmfAsset(v) : v; else prev.hidden = true;
        var b = btn(v ? 'Change photo' : 'Choose photo', function () {
            pickFile().then(function (f) { if (!f) return; return uploadPhoto(f).then(function (res) { v = res.path; prev.src = res.preview; prev.hidden = false; b.textContent = 'Change photo'; }); })
                .catch(function (e) { toast(e.message, true, 6000); });
        });
        var rm = btn('Remove', function () { v = ''; prev.hidden = true; b.textContent = 'Choose photo'; });
        var row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '6px'; row.appendChild(b); row.appendChild(rm);
        w.appendChild(row); w.appendChild(prev); w.getValue = function () { return v; };
        return field(label, w);
    }

    /* ---------- sections ---------- */
    function openSection(existingIndex) {
        var list = state['data/sections.json'] = state['data/sections.json'] || [];
        var cur = typeof existingIndex === 'number' ? list[existingIndex] : null;
        var b = document.createElement('div');
        var pos = select([['bottom', 'At the bottom of this page'], ['top', 'At the top of this page']], cur && cur.position);
        var head = input(cur && cur.heading, 'e.g. Our December Camp');
        var photo = photoField('Photo (optional)', cur && cur.image);
        var rich = richBox(cur && cur.body);
        var bt = input(cur && cur.button_text, 'e.g. Donate now'), bl = input(cur && cur.button_link, 'e.g. donate.html');
        b.appendChild(field('Where?', pos)); b.appendChild(field('Heading', head)); b.appendChild(photo);
        b.appendChild(field('Text', rich, 'Use the buttons for bold, lists, headings, links and photos.'));
        b.appendChild(field('Button text (optional)', bt)); b.appendChild(field('Button link', bl, 'A page like donate.html, or a full web address.'));
        modal(cur ? 'Edit section' : 'Add a section to this page', b, function () {
            var sec = { page: pageKey, position: pos.value, heading: head.value.trim(), image: photo.querySelector('div').getValue(), body: rich.getHTML(), button_text: bt.value.trim(), button_link: bl.value.trim() };
            if (!sec.heading && !sec.body && !sec.image) { toast('Add a heading, some text or a photo first.', true); return false; }
            if (cur) list[existingIndex] = sec; else list.push(sec);
            mark('data/sections.json'); rerenderSections(); toast('Section ' + (cur ? 'updated' : 'added') + '. Press Publish to put it live.');
        }, cur ? 'Update section' : 'Add section');
    }
    function rerenderSections() {
        document.querySelectorAll('[data-sec-index]').forEach(function (n) { n.remove(); });
        var main = document.querySelector('main'); if (!main) return;
        (state['data/sections.json'] || []).forEach(function (sec, idx) {
            if (!sec || sec.page !== pageKey) return;
            var el = document.createElement('section'); el.className = 'section container cms-rich cms-section'; el.setAttribute('data-sec-index', idx);
            var h = '';
            if (sec.image) h += '<div class="cms-section-media"><img src="' + esc(lmfAsset(sec.image)) + '" alt=""></div>';
            if (sec.heading) h += '<h3 class="section-title">' + esc(sec.heading) + '</h3>';
            h += lmfRich(sec.body);
            if (sec.button_text && sec.button_link) h += '<a class="cms-section-btn" href="' + esc(sec.button_link) + '">' + esc(sec.button_text) + '</a>';
            el.innerHTML = h;
            if (sec.position === 'top') main.insertBefore(el, main.firstChild); else main.appendChild(el);
        });
        decorateSections();
    }
    function decorateSections() {
        document.querySelectorAll('[data-sec-index]').forEach(function (el) {
            if (el.querySelector('.lmf-secctl')) return;
            var idx = +el.getAttribute('data-sec-index');
            var c = document.createElement('div'); c.className = 'lmf-secctl';
            c.appendChild(btn('✏️ Edit', function () { openSection(idx); }));
            var d = btn('🗑 Delete', function () {
                if (!window.confirm('Delete this section?')) return;
                state['data/sections.json'].splice(idx, 1); mark('data/sections.json'); rerenderSections();
            }); d.className = 'lmf-del'; c.appendChild(d);
            el.appendChild(c);
        });
    }

    /* ---------- pages ---------- */
    function findPage() {
        var slug = (new URLSearchParams(location.search).get('p') || '').toLowerCase();
        var list = state['data/pages.json'] || [];
        for (var i = 0; i < list.length; i++) if ((list[i].slug || '').toLowerCase() === slug) return i;
        return undefined;
    }
    function openPage(idx) {
        var list = state['data/pages.json'] = state['data/pages.json'] || [];
        var cur = typeof idx === 'number' ? list[idx] : null;
        var b = document.createElement('div');
        var title = input(cur && cur.title, 'e.g. Our Partners');
        var slug = input(cur && cur.slug, 'e.g. partners');
        var photo = photoField('Banner photo', cur && cur.image);
        var intro = document.createElement('textarea'); intro.rows = 2; intro.value = (cur && cur.intro) || '';
        var rich = richBox(cur && cur.body);
        var addMenu = document.createElement('input'); addMenu.type = 'checkbox'; addMenu.checked = !cur;
        var mLabel = document.createElement('label'); mLabel.style.fontWeight = '600'; mLabel.appendChild(addMenu); mLabel.appendChild(document.createTextNode(' Add this page to the top menu'));
        title.addEventListener('input', function () { if (!cur && !slug.dataset.touched) slug.value = title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); });
        slug.addEventListener('input', function () { slug.dataset.touched = '1'; });
        b.appendChild(field('Page title', title)); b.appendChild(field('Page address', slug, 'Short, lowercase, no spaces. The page will be at /page.html?p=' + (slug.value || 'address')));
        b.appendChild(photo); b.appendChild(field('Short introduction', intro)); b.appendChild(field('Page content', rich, 'Use the buttons for bold, lists, headings, links and photos.'));
        if (!cur) b.appendChild(mLabel);
        if (cur) {
            var del = btn('🗑 Delete this page', function () {
                if (!window.confirm('Delete the page "' + cur.title + '"? Remember to remove it from the menu too.')) return;
                list.splice(idx, 1); mark('data/pages.json'); document.querySelector('.lmf-modal-bg').remove(); toast('Page deleted. Press Publish.');
            }); del.style.background = '#b42318'; del.style.marginTop = '14px'; b.appendChild(del);
        }
        modal(cur ? 'Edit this page' : 'Create a new page', b, function () {
            var s = slug.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
            if (!title.value.trim() || !s) { toast('Please give the page a title and an address.', true); return false; }
            var clash = list.some(function (p, i) { return i !== idx && (p.slug || '').toLowerCase() === s; });
            if (clash) { toast('Another page already uses that address.', true); return false; }
            var pg = { title: title.value.trim(), slug: s, image: photo.querySelector('div').getValue(), intro: intro.value.trim(), body: rich.getHTML() };
            if (cur) list[idx] = pg; else list.push(pg);
            mark('data/pages.json');
            if (!cur && addMenu.checked) {
                var menu = state['data/menu.json'] = state['data/menu.json'] || { header: [], footer: [] };
                var at = Math.max(0, (menu.header || []).length - 1);
                menu.header.splice(at, 0, { label: pg.title, url: 'page.html?p=' + s, button: false });
                mark('data/menu.json'); applyMenuNow(menu);
            }
            toast(cur ? 'Page updated. Press Publish.' : 'Page created. Press Publish, then visit /page.html?p=' + s, false, 6000);
        }, cur ? 'Update page' : 'Create page');
    }

    /* ---------- menus ---------- */
    function openMenu() {
        var menu = clone(state['data/menu.json'] || { header: [], footer: [] });
        var b = document.createElement('div');
        function listEditor(key, title, withButton) {
            var w = document.createElement('div'); var h = document.createElement('label'); h.textContent = title; w.appendChild(h);
            var rows = document.createElement('div'); w.appendChild(rows);
            function draw() {
                rows.innerHTML = '';
                (menu[key] || []).forEach(function (it, i) {
                    var r = document.createElement('div'); r.className = 'lmf-menu-row';
                    var l = input(it.label, 'Text'), u = input(it.url, 'Link');
                    l.addEventListener('input', function () { it.label = l.value; }); u.addEventListener('input', function () { it.url = u.value; });
                    var bs = document.createElement('div'); bs.className = 'lmf-rowbtns';
                    bs.appendChild(btn('↑', function () { if (i) { menu[key].splice(i - 1, 0, menu[key].splice(i, 1)[0]); draw(); } }));
                    bs.appendChild(btn('↓', function () { if (i < menu[key].length - 1) { menu[key].splice(i + 1, 0, menu[key].splice(i, 1)[0]); draw(); } }));
                    if (withButton) { var hb = btn(it.button ? '★' : '☆', function () { it.button = !it.button; draw(); }); hb.title = 'Show as highlighted button'; bs.appendChild(hb); }
                    bs.appendChild(btn('✕', function () { menu[key].splice(i, 1); draw(); }));
                    r.appendChild(l); r.appendChild(u); r.appendChild(bs); rows.appendChild(r);
                });
            }
            draw();
            w.appendChild(btn('＋ Add link', function () { (menu[key] = menu[key] || []).push({ label: 'New link', url: '', button: false }); draw(); }));
            return w;
        }
        b.appendChild(listEditor('header', 'Top menu', true));
        var hint = document.createElement('div'); hint.className = 'lmf-hint'; hint.textContent = '★ = highlighted button (like DONATE). Links: a page like health.html, page.html?p=partners, or a full web address.'; b.appendChild(hint);
        b.appendChild(listEditor('footer', 'Footer links', false));
        modal('Edit menus', b, function () {
            ['header', 'footer'].forEach(function (k) { menu[k] = (menu[k] || []).filter(function (x) { return (x.label || '').trim() && (x.url || '').trim(); }); });
            state['data/menu.json'] = menu; mark('data/menu.json'); applyMenuNow(menu);
            toast('Menu updated. Press Publish to put it live.');
        }, 'Save menu');
    }
    function applyMenuNow(menu) {
        var nav = document.getElementById('main-nav');
        if (nav) { nav.textContent = ''; menu.header.forEach(function (it) { var a = document.createElement('a'); a.href = it.url; a.textContent = it.label; a.className = 'nav-link' + (it.button ? ' donate-btn' : ''); nav.appendChild(a); }); }
        var f = document.querySelector('.footer-links');
        if (f) { f.textContent = ''; menu.footer.forEach(function (it) { var a = document.createElement('a'); a.href = it.url; a.textContent = it.label; a.className = 'nav-link'; f.appendChild(a); }); }
    }

    /* ---------- publish ---------- */
    function publish() {
        var files = {};
        Object.keys(dirty).forEach(function (f) { files[f] = state[f]; });
        if (!Object.keys(files).length) return;
        pubBtn.disabled = true; pubBtn.textContent = 'Publishing…';
        api('/api/save', { files: files, message: 'Website update: ' + Object.keys(files).map(function (f) { return f.replace('data/', '').replace('.json', ''); }).join(', ') })
            .then(function () {
                dirty = {}; changes = 0; updateBar();
                toast('✅ Published! The live website updates within about 5 minutes.', false, 6000);
            })
            .catch(function (e) { toast('Could not publish: ' + e.message, true, 8000); pubBtn.disabled = false; updateBar(); });
    }

    /* ---------- start ---------- */
    function start() {
        LMF_EDIT.data.then(function (all) {
            if (!all) { toast('Could not load the editor. Check your internet and refresh.', true, 8000); return; }
            FILES.forEach(function (f) { state[f] = all[f] != null ? clone(all[f]) : (f === 'data/menu.json' ? { header: [], footer: [] } : (/sections|pages/.test(f) ? [] : {})); });
            buildBar(); enableText(); enableImages();
            setTimeout(decorateSections, 800);
            toast('Hi ' + NAME + '! Click any outlined text to edit it, or point at a photo to replace it.', false, 5000);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
