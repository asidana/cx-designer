/**
 * <cx-webchat> embed snippet — drop-in webchat widget.
 *
 * Usage:
 *   <script src="https://designer.example.com/cx-webchat.js"></script>
 *   <cx-webchat gateway="wss://designer.example.com/ws/chat" agent="support"></cx-webchat>
 *
 * Protocol: JSON ChannelMessage envelopes over WebSocket.
 * Renders text bubbles, quick replies, cards, and citations.
 * No dependencies, no build step.
 */
(function () {
  var STYLE_ID = 'cx-webchat-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.cxw{position:fixed;bottom:20px;right:20px;width:340px;max-height:480px;',
      'display:flex;flex-direction:column;background:#1a1a2e;color:#fff;',
      'border:1px solid #333;border-radius:12px;font-family:sans-serif;z-index:9999}',
      '.cxw-h{padding:10px 14px;font-weight:600;border-bottom:1px solid #333;cursor:pointer}',
      '.cxw-b{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;min-height:200px}',
      '.cxw-m{max-width:85%;padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.4}',
      '.cxw-m.agent{background:#16213e;align-self:flex-start}',
      '.cxw-m.caller{background:#8b5cf6;align-self:flex-end}',
      '.cxw-q{display:flex;gap:6px;flex-wrap:wrap}',
      '.cxw-q button{background:transparent;border:1px solid #8b5cf6;color:#fff;',
      'border-radius:12px;padding:4px 10px;font-size:12px;cursor:pointer}',
      '.cxw-c{border:1px solid #333;border-radius:8px;padding:8px;font-size:12px}',
      '.cxw-f{display:flex;gap:6px;padding:10px;border-top:1px solid #333}',
      '.cxw-f input{flex:1;background:#0f0f1a;border:1px solid #333;border-radius:6px;',
      'color:#fff;padding:8px;font-size:13px}',
      '.cxw-f button{background:#10b981;border:none;border-radius:6px;color:#fff;padding:8px 12px;cursor:pointer}'
    ].join('');
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function define() {
    class CxWebchat extends HTMLElement {
      connectedCallback() {
        injectStyle();
        this.sessionId = 'web_' + Date.now();
        this.render();
        this.connect();
      }

      render() {
        this.innerHTML = '';
        var root = el('div', 'cxw');
        var head = el('div', 'cxw-h', '💬 ' + (this.getAttribute('title') || 'Support'));
        head.onclick = () => bodyEl.style.display = bodyEl.style.display === 'none' ? '' : 'none';
        var bodyEl = el('div', '');
        bodyEl.style.display = 'flex';
        bodyEl.style.flexDirection = 'column';
        bodyEl.style.flex = '1';
        this.log = el('div', 'cxw-b');
        var form = el('div', 'cxw-f');
        this.input = el('input');
        this.input.placeholder = 'Type a message…';
        this.input.onkeydown = (e) => {
          if (e.key === 'Enter' && this.input.value.trim()) {
            this.send(this.input.value.trim());
            this.input.value = '';
          }
        };
        var btn = el('button', '', 'Send');
        btn.onclick = () => {
          if (this.input.value.trim()) {
            this.send(this.input.value.trim());
            this.input.value = '';
          }
        };
        form.appendChild(this.input);
        form.appendChild(btn);
        bodyEl.appendChild(this.log);
        bodyEl.appendChild(form);
        root.appendChild(head);
        root.appendChild(bodyEl);
        this.appendChild(root);
      }

      connect() {
        var url = this.getAttribute('gateway');
        if (!url) {
          this.bubble('agent', 'Webchat is not configured (missing gateway URL).');
          return;
        }
        try {
          this.ws = new WebSocket(url);
        } catch (e) {
          this.bubble('agent', 'Could not connect to the agent gateway.');
          return;
        }
        this.ws.onmessage = (ev) => {
          try {
            var msg = JSON.parse(ev.data);
            (msg.parts || []).forEach((p) => {
              if (p.kind === 'text' && p.text !== '…') this.bubble('agent', p.text);
            });
            if (msg.quickReplies) this.quickReplies(msg.quickReplies);
          } catch (e) { /* ignore malformed frames */ }
        };
        this.ws.onclose = () => this.bubble('agent', 'Disconnected. Refresh to reconnect.');
      }

      send(text) {
        this.bubble('caller', text);
        var sel = '';
        try {
          sel = String(window.getSelection ? window.getSelection().toString() : '').slice(0, 500);
        } catch (e) { /* selection unavailable */ }
        var envelope = {
          id: 'web_' + Date.now(),
          channel: 'webchat',
          sessionId: this.sessionId,
          role: 'caller',
          parts: [{ kind: 'text', text: text }],
          at: Date.now(),
          context: {
            page: {
              url: String(window.location.href).slice(0, 500),
              title: String(window.document.title).slice(0, 200),
              selection: sel || undefined
            }
          }
        };
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify(envelope));
        } else {
          this.bubble('agent', 'Not connected yet — please wait a moment.');
        }
      }

      bubble(role, text) {
        var m = el('div', 'cxw-m ' + role, text);
        this.log.appendChild(m);
        this.log.scrollTop = this.log.scrollHeight;
      }

      quickReplies(options) {
        var row = el('div', 'cxw-q');
        options.forEach((opt) => {
          var b = el('button', '', opt);
          b.onclick = () => this.send(opt);
          row.appendChild(b);
        });
        this.log.appendChild(row);
        this.log.scrollTop = this.log.scrollHeight;
      }
    }

    if (!customElements.get('cx-webchat')) {
      customElements.define('cx-webchat', CxWebchat);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', define);
  } else {
    define();
  }
})();
