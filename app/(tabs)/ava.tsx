import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Send, MessageCircleOff } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { ChatBubble } from "@/components/participant/ChatBubble";
import { SuggestionChips } from "@/components/participant/SuggestionChips";
import { respondAsAva } from "@/lib/ava/respond";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import type { SignedCard } from "@/lib/data/repository";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";

interface Message {
  role: "user" | "ava";
  text: string;
}

const SUGGESTIONS = [
  "What does my vascular score mean?",
  "Tell me about my biological age",
  "What are my focus areas?",
  "Who reviewed my card?",
];

export default function AvaPage() {
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);

  useEffect(() => {
    repository.getSignedCard(DEMO_PARTICIPANT_ID).then(setCard);
    return repository.subscribe(() => {
      repository.getSignedCard(DEMO_PARTICIPANT_ID).then(setCard);
    });
  }, []);

  if (card === undefined) return null;

  if (!card) {
    return (
      <MobileShell>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <MessageCircleOff size={24} color={colors.inkMuted} />
          </View>
          <Text style={styles.emptyTitle}>AVA isn't ready yet</Text>
          <Text style={styles.emptyText}>
            AVA can only discuss your reviewed and signed health card. It will be
            available once your care team has finished their review.
          </Text>
        </View>
      </MobileShell>
    );
  }

  return <AvaChatContent card={card} />;
}

function AvaChatContent({ card }: { card: SignedCard }) {
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "user", text: "What does my metabolic score mean?" },
    {
      role: "ava",
      text: respondAsAva("What does my metabolic score mean?", card),
    },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = respondAsAva(trimmed, card);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "ava", text: reply },
    ]);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <MobileShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ask AVA about your results</Text>
          <Text style={styles.subtitle}>
            Read-only · based on your reviewed card
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role}>
              {m.text}
            </ChatBubble>
          ))}
        </ScrollView>

        <View style={styles.inputArea}>
          <SuggestionChips items={SUGGESTIONS} onPick={send} />
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your card..."
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => send(input)}
            >
              <Send size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginBottom: 20 },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 4,
  },
  messagesContent: { gap: 12, paddingBottom: 16 },
  inputArea: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.bone,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginTop: 16,
  },
  emptyText: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 280,
  },
});
