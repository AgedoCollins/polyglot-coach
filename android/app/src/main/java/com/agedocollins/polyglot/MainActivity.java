package com.agedocollins.polyglot;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoicePlugin.class); // our own TTS: picks the engine that really has the language
        super.onCreate(savedInstanceState);
    }
}
