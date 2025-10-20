import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

const BASE_URL = "http://10.0.2.2:3000";

export default function App() {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  async function ask() {
    const question = q.trim();
    if (!question) return;
    setQ("");
    setHistory((h) => [...h, { role: "user", text: question }]);
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await r.json();
      const meta = data.sources
        ?.map((s) => `#${s.id} (sim=${s.sim.toFixed(2)})`)
        .join("  ");
      setHistory((h) => [...h, { role: "bot", text: data.answer, meta }]);
    } catch {
      setHistory((h) => [
        ...h,
        { role: "bot", text: "Erro ao consultar o regulamento." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const Bubble = ({ item }) => (
    <View
      style={{
        alignSelf: item.role === "user" ? "flex-end" : "flex-start",
        maxWidth: "90%",
        marginVertical: 6,
      }}
    >
      <View
        style={{
          backgroundColor: item.role === "user" ? "#2563eb" : "#111827",
          padding: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>{item.text}</Text>
        {!!item.meta && (
          <Text style={{ color: "#9ca3af", marginTop: 6, fontSize: 12 }}>
            {item.meta}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          style={{ flex: 1, padding: 12 }}
          data={history}
          keyExtractor={(_, i) => String(i)}
          renderItem={Bubble}
        />
        <View
          style={{
            flexDirection: "row",
            padding: 10,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: "#1f2937",
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: "#111827",
              color: "white",
              padding: 12,
              borderRadius: 10,
            }}
            placeholder="Pergunte algo do regulamento..."
            placeholderTextColor="#6b7280"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={ask}
            returnKeyType="send"
          />
          <Pressable
            onPress={ask}
            disabled={loading}
            style={{
              backgroundColor: "#22c55e",
              paddingHorizontal: 16,
              borderRadius: 10,
              justifyContent: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text style={{ color: "black", fontWeight: "700" }}>Enviar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
