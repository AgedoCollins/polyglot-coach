package com.agedocollins.polyglot;

import android.content.Intent;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Text-to-speech that does not depend on the phone's default engine.
 * Samsung phones use "Samsung TTS" by default, which often has no Dutch voice:
 * here each language is spoken by the first installed engine that really has it
 * (Google first, then the default, then any other).
 */
@CapacitorPlugin(name = "Voice")
public class VoicePlugin extends Plugin {
    private static final String GOOGLE = "com.google.android.tts";
    private final Map<String, TextToSpeech> engines = new HashMap<>();   // engine package -> ready engine
    private final Map<String, String> langEngine = new HashMap<>();      // lang tag -> engine package
    private final Map<String, PluginCall> pending = new HashMap<>();
    private TextToSpeech current;
    private int seq = 0;

    private interface Ready { void run(TextToSpeech t); }

    /** start (or reuse) an engine; ready gets null if it fails */
    private void engine(String pkg, Ready ready) {
        TextToSpeech t = engines.get(pkg);
        if (t != null) { ready.run(t); return; }
        final TextToSpeech[] box = new TextToSpeech[1];
        box[0] = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                engines.put(pkg, box[0]);
                box[0].setOnUtteranceProgressListener(listener);
                ready.run(box[0]);
            } else { ready.run(null); }
        }, pkg);
    }

    private List<String> candidates() {
        List<String> out = new ArrayList<>();
        TextToSpeech probe = engines.isEmpty() ? null : engines.values().iterator().next();
        List<TextToSpeech.EngineInfo> infos;
        if (probe != null) infos = probe.getEngines();
        else { TextToSpeech tmp = new TextToSpeech(getContext(), s -> {}); infos = tmp.getEngines(); tmp.shutdown(); }
        boolean hasGoogle = false;
        for (TextToSpeech.EngineInfo e : infos) if (GOOGLE.equals(e.name)) hasGoogle = true;
        if (hasGoogle) out.add(GOOGLE);
        for (TextToSpeech.EngineInfo e : infos) if (!out.contains(e.name)) out.add(e.name);
        return out;
    }

    private static boolean has(TextToSpeech t, Locale l) {
        if (t == null) return false;
        int r = t.isLanguageAvailable(l);
        if (r < TextToSpeech.LANG_AVAILABLE) return false;
        // some engines say "available" but have no installed voice data
        try {
            for (Voice v : t.getVoices()) {
                if (v.getLocale().getLanguage().equals(l.getLanguage())
                        && !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) return true;
            }
            return false;
        } catch (Exception e) { return true; }
    }

    /** find an engine for lang, trying each installed engine in turn */
    private void resolve(String lang, Ready ready) {
        String known = langEngine.get(lang);
        if (known != null) { engine(known, ready); return; }
        List<String> list = candidates();
        tryNext(list, 0, Locale.forLanguageTag(lang), lang, ready);
    }

    private void tryNext(List<String> list, int i, Locale loc, String lang, Ready ready) {
        if (i >= list.size()) { ready.run(null); return; }
        String pkg = list.get(i);
        engine(pkg, t -> {
            if (has(t, loc)) { langEngine.put(lang, pkg); ready.run(t); }
            else tryNext(list, i + 1, loc, lang, ready);
        });
    }

    @PluginMethod
    public void isLanguageSupported(PluginCall call) {
        String lang = call.getString("lang", "en-GB");
        resolve(lang, t -> {
            JSObject r = new JSObject();
            r.put("supported", t != null);
            r.put("engine", langEngine.get(lang));
            call.resolve(r);
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "en-GB");
        float rate = call.getFloat("rate", 1f);
        resolve(lang, t -> {
            if (t == null) { call.reject("no voice for " + lang, "no_voice"); return; }
            if (current != null && current != t) current.stop();
            current = t;
            t.setLanguage(Locale.forLanguageTag(lang));
            t.setSpeechRate(rate);
            String id = "u" + (++seq);
            pending.put(id, call);
            call.setKeepAlive(true);
            Bundle b = new Bundle();
            b.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            if (t.speak(text, TextToSpeech.QUEUE_FLUSH, b, id) != TextToSpeech.SUCCESS) finish(id, false);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        for (TextToSpeech t : engines.values()) t.stop();
        for (String id : new ArrayList<>(pending.keySet())) finish(id, true);
        call.resolve();
    }

    /** reset after the user installed a voice */
    @PluginMethod
    public void refresh(PluginCall call) {
        langEngine.clear();
        for (TextToSpeech t : engines.values()) t.shutdown();
        engines.clear();
        call.resolve();
    }

    /** open Google voice-data install screen (Dutch etc.) */
    @PluginMethod
    public void openInstall(PluginCall call) {
        Intent i = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
        i.setPackage(GOOGLE);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); call.resolve(); return; } catch (Exception ignored) {}
        try {
            Intent store = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=" + GOOGLE));
            store.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(store);
            call.resolve();
        } catch (Exception e) { call.reject("cannot open install"); }
    }

    private void finish(String id, boolean ok) {
        PluginCall c = pending.remove(id);
        if (c == null) return;
        c.setKeepAlive(false);
        c.resolve();
    }

    private final UtteranceProgressListener listener = new UtteranceProgressListener() {
        @Override public void onStart(String id) {}
        @Override public void onDone(String id) { finish(id, true); }
        @Override public void onError(String id) { finish(id, false); }
        @Override public void onStop(String id, boolean interrupted) { finish(id, false); }
    };

    @Override
    protected void handleOnDestroy() {
        for (TextToSpeech t : engines.values()) t.shutdown();
        engines.clear();
    }
}
