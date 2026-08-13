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
import type { AiDraft, Biomarker, Participant, Pipeline } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

interface Message {
  role: "user" | "ava";
  text: string;
  disclaimer?: string;
}

const REVIEWED_SUGGESTIONS = [
  "What does my vascular score mean?",
  "Tell me about my biological age",
  "What are my focus areas?",
  "Who reviewed my card?",
];
const PRELIMINARY_SUGGESTIONS = [
  "What does my vascular score mean?",
  "Tell me about my biological age",
  "How can I improve my metabolic health?",
  "What should I focus on first?",
];

export default function AvaPage() {
  const { participantId } = useAuth();
  const { q, qid } = useLocalSearchParams<{ q?: string; qid?: string }>();
  const [card, setCard] = useState<SignedCard | null | undefined>(undefined);
  const [aiDraft, setAiDraft] = useState<AiDraft | null | undefined>(undefined);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null | undefined>(undefined);
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (!participantId) return;
    const load = () => {
      repository.getSignedCard(participantId).then(setCard);
      repository.getAiDraft(participantId).then(setAiDraft);
      repository.getBiomarkers(participantId).then(setBiomarkers);
      repository.getPipeline(participantId).then(setPipeline);
      repository.getParticipant(participantId).then(setParticipant);
    };
    load();
    return repository.subscribe(load);
  }, [participantId]);

  if (card === undefined || pipeline === undefined || aiDraft === undefined) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  // AVA is available the moment there's something to ground on -- a delivered card,
  // or (in real/Supabase mode, where grounding happens server-side against the live
  // draft) as soon as an AI draft exists, which is right after the questionnaire. That
  // is what makes AVA an "ask anytime" copilot instead of a post-sign-off tab. Mock
  // mode stays gated to a delivered card, since its rule-based responder speaks in
  // "your reviewed card" terms and has no live model behind it.
  const reviewed = !!card;
  const groundingCard: SignedCard | null = card
    ? card
    : aiDraft && participant && isSupabaseConfigured
      ? { participant, aiDraft, biomarkers, reviews: [] }
      : null;

  if (!groundingCard) {
    return (
      <MobileShell name={participant?.name}>
        <AvaPromo pipelineState={pipeline?.state ?? "capturing"} />
      </MobileShell>
    );
  }

  return (
    <AvaChatContent
      card={groundingCard}
      reviewed={reviewed}
      seedQuestion={q}
      seedId={qid}
      participant={participant}
    />
  );
}

function AvaChatContent({
  card,
  reviewed,
  seedQuestion,
  seedId,
  participant,
}: {
  card: SignedCard;
  reviewed: boolean;
  seedQuestion?: string;
  seedId?: string;
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
        text: reviewed
          ? "I can walk you through your scores, your biological age, or your focus areas — or answer any wellness question you have. Where would you like to start?"
          : "I can walk you through your early results so far, or answer any wellness question. Just note these scores are still being reviewed by your care team. Where would you like to start?",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Track the last seed we've fired so a new question (a fresh qid nonce from
  // useAskAva) re-seeds even though this tab screen stays mounted between visits.
  const lastSeedRef = useRef<string | undefined>(undefined);

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
    if (!seedQuestion) return;
    const token = seedId ?? seedQuestion;
    if (token === lastSeedRef.current) return;
    lastSeedRef.current = token;
    send(seedQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuestion, seedId]);

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
            {reviewed
              ? "Ask about your reviewed card or any wellness question — general information, not medical advice."
              : "Ask about your early results or any wellness question — your scores are still under care-team review. General information, not medical advice."}
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
            <SuggestionChips items={reviewed ? REVIEWED_SUGGESTIONS : PRELIMINARY_SUGGESTIONS} onPick={send} />
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
    width: 46,
    height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  statusDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bone,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.sageDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    lineHeight: 30,
    letterSpacing: -0.3,
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
    gap: spacing.lg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bone,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii["2xl"],
    paddingLeft: spacing.xl,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    ...shadows.soft,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
