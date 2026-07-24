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
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { ChatBubble } from "@/components/participant/ChatBubble";
import { SuggestionChips } from "@/components/participant/SuggestionChips";
import { AvaPromo } from "@/components/participant/AvaPromo";
import { respondAsAva } from "@/lib/ava/respond";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { askAva } from "@/lib/ai/client";
import type { SignedCard } from "@/lib/data/repository";
import type { Pipeline } from "@/lib/types/db";
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
  const { participantId } = useAuth();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);
  const [pipeline, setPipeline] = useState<Pipeline | null | undefined>(undefined);

  useEffect(() => {
    if (!participantId) return;
    repository.getSignedCard(participantId).then(setCard);
    repository.getPipeline(participantId).then(setPipeline);
    return repository.subscribe(() => {
      repository.getSignedCard(participantId).then(setCard);
      repository.getPipeline(participantId).then(setPipeline);
    });
  }, [participantId]);

  if (card === undefined || pipeline === undefined) return null;

  if (!card) {
    return (
      <MobileShell>
        <AvaPromo pipelineState={pipeline?.state ?? "capturing"} />
      </MobileShell>
    );
  }

  return <AvaChatContent card={card} seedQuestion={q} />;
}

function AvaChatContent({
  card,
  seedQuestion,
}: {
  card: SignedCard;
  seedQuestion?: string;
}) {
  const { session, participantId } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>(() =>
    seedQuestion
      ? []
      : [
          { role: "user", text: "What does my metabolic score mean?" },
          {
            role: "ava",
            text: respondAsAva("What does my metabolic score mean?", card),
          },
        ]
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const seededRef = useRef(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    if (isSupabaseConfigured && session?.access_token && participantId) {
      setSending(true);
      try {
        const { reply } = await askAva(session.access_token, participantId, trimmed, history);
        setMessages((prev) => [...prev, { role: "ava", text: reply }]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: "ava", text: "AVA is unavailable right now — please try again shortly." },
        ]);
      } finally {
        setSending(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
      return;
    }

    const reply = respondAsAva(trimmed, card);
    setMessages((prev) => [...prev, { role: "ava", text: reply }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  useEffect(() => {
    if (seedQuestion && !seededRef.current) {
      seededRef.current = true;
      send(seedQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion]);

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
});
