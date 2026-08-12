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
import { Send, Sparkles } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { FadeInView } from "@/components/ui/FadeInView";
import { LoadingState } from "@/components/ui/LoadingState";
import { ChatBubble } from "@/components/participant/ChatBubble";
import { TypingIndicator } from "@/components/participant/TypingIndicator";
import { SuggestionChips } from "@/components/participant/SuggestionChips";
import { AvaPromo } from "@/components/participant/AvaPromo";
import { respondAsAva } from "@/lib/ava/respond";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { askAva } from "@/lib/ai/client";
import type { SignedCard } from "@/lib/data/repository";
import type { Participant, Pipeline } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

interface Message {
  role: "user" | "ava";
  text: string;
  disclaimer?: string;
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
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (!participantId) return;
    repository.getSignedCard(participantId).then(setCard);
    repository.getPipeline(participantId).then(setPipeline);
    repository.getParticipant(participantId).then(setParticipant);
    return repository.subscribe(() => {
      repository.getSignedCard(participantId).then(setCard);
      repository.getPipeline(participantId).then(setPipeline);
      repository.getParticipant(participantId).then(setParticipant);
    });
  }, [participantId]);

  if (card === undefined || pipeline === undefined) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  if (!card) {
    return (
      <MobileShell name={participant?.name}>
        <AvaPromo pipelineState={pipeline?.state ?? "capturing"} />
      </MobileShell>
    );
  }

  return <AvaChatContent card={card} seedQuestion={q} participant={participant} />;
}

function AvaChatContent({
  card,
  seedQuestion,
  participant,
}: {
  card: SignedCard;
  seedQuestion?: string;
  participant: Participant | null;
}) {
  const { session, participantId } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  // Open with a genuine AVA greeting rather than a fabricated user turn answered
  // by the mock engine. The old seed called respondAsAva() unconditionally, so on
  // a real (Supabase) deployment the very first thing a participant saw was mock
  // content presented as if they'd asked it. A static greeting behaves identically
  // in mock and real mode and matches how every assistant UI opens (greet, then
  // let the user drive) -- the real grounded answer comes from their first message.
  const [messages, setMessages] = useState<Message[]>(() => {
    if (seedQuestion) return [];
    return [
      {
        role: "ava",
        text: "I can walk you through what's driving your scores, your biological age, or your suggested focus areas. What would you like to start with?",
      },
    ];
  });
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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      try {
        const { reply, disclaimer } = await askAva(session.access_token, participantId, trimmed, history);
        setMessages((prev) => [...prev, { role: "ava", text: reply, disclaimer }]);
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
    setMessages((prev) => [...prev, { role: "ava", text: reply.text, disclaimer: reply.disclaimer }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  useEffect(() => {
    if (seedQuestion && !seededRef.current) {
      seededRef.current = true;
      send(seedQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion]);

  const canSend = input.trim().length > 0 && !sending;

  return (
    <MobileShell name={participant?.name}>
      <FadeInView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avaBadge}>
              <Sparkles size={20} color={colors.white} />
              <View style={styles.statusDot} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>AVA · Wellness concierge</Text>
              <Text style={styles.title}>
                {participant
                  ? `Hi ${participant.name.split(" ")[0]}, let's go through your results`
                  : "Ask AVA about your results"}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Ask about your reviewed wellness card — this is general information, not medical
            advice.
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} disclaimer={m.disclaimer}>
              {m.text}
            </ChatBubble>
          ))}
          {sending && <TypingIndicator />}
        </ScrollView>

        <View style={styles.inputArea}>
          <View>
            <Text style={styles.suggestLabel}>Try asking</Text>
            <SuggestionChips items={SUGGESTIONS} onPick={send} />
          </View>
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message AVA..."
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={() => send(input)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              activeOpacity={0.85}
            >
              <Send size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      </FadeInView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginBottom: spacing.xl },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avaBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.sageDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  messagesContent: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  inputArea: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bone,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    ...shadows.card,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
