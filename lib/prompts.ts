import type { ResumeData, BrushupField } from "./resume-schema";
import { BRUSHUP_FIELDS } from "./resume-schema";

export const CHAT_SYSTEM_PROMPT = `あなたは転職活動者を支援する、親しみやすく丁寧なキャリアアドバイザーです。
ユーザーと対話しながら、履歴書と職務経歴書の作成に必要な情報を聞き出すのが役割です。

# 進め方
- 一度に聞く質問は1つだけ。ユーザーを質問攻めにしない。
- 自然な会話のトーンで、相手が答えやすいように具体例を添える。
- まず基本情報（氏名・ふりがな・生年月日・連絡先・住所）から始め、
  次に学歴・職歴・免許資格、最後に志望動機・自己PR・職務要約・スキルへ進む。
- ユーザーの回答から具体的な情報が判明したら、必ず updateResumeFields ツールを呼んで
  履歴書データに反映する。会話の各ターンで新情報があれば都度呼ぶこと。
- 配列項目（学歴・職歴・免許資格・職務経歴）は、判明している全件をまとめて渡す。

# 重要な注意
- 志望動機・自己PR・職務要約は、この時点では「本人が話した内容そのまま」を保存する。
  あなたが勝手に美化・脚色しない。文章のブラッシュアップは別機能が担当する。
- 情報が一通り集まったら、「右側のプレビューで内容を確認し、志望動機や自己PRは
  『AIブラッシュアップ』ボタンで魅力的な文章に整えられます」と案内する。
- 回答は簡潔に。長い前置きは不要。`;

export function buildChatSystemPrompt(
  jobPosting: string,
  jobAnalysis: { companyName: string; requirements: string; questions: string[] } | null,
): string {
  let prompt = CHAT_SYSTEM_PROMPT;

  if (jobAnalysis) {
    const companyLabel = jobAnalysis.companyName ? `会社名: ${jobAnalysis.companyName}\n` : "";
    prompt += `

# 求人分析結果
${companyLabel}求める人材像: ${jobAnalysis.requirements}

ヒアリング項目（この順番で聞き出す）:
${jobAnalysis.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

ユーザーのメッセージが "[__HIRING_START__]" で始まる場合は、
システムからのヒアリング開始指示です。
「この求人の分析が完了しました。${jobAnalysis.companyName ? jobAnalysis.companyName + "への" : ""}応募に向けて、いくつか確認させてください」
という形でヒアリング項目の最初の質問を1つだけ返す。`;
  }

  if (jobPosting) {
    prompt += `

# 応募先の求人情報
${jobPosting}`;
  }

  return prompt;
}

export function buildBrushupPrompt(
  field: BrushupField,
  originalText: string,
  resume: ResumeData,
  jobPosting: string,
): string {
  const label = BRUSHUP_FIELDS[field];
  const context = [
    resume.basic.name && `応募者: ${resume.basic.name}`,
    resume.careers.length > 0 &&
      `職務経歴: ${resume.careers
        .map((c) => `${c.company}（${c.role}）${c.description}`)
        .join(" / ")}`,
    resume.workHistory.length > 0 &&
      `職歴: ${resume.workHistory.map((w) => w.description).join(" / ")}`,
    resume.skills && `スキル: ${resume.skills}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `あなたは経験豊富な転職エージェントです。応募者が書いた「${label}」を、
採用担当者の心に響く、より効果的な文章にブラッシュアップしてください。

# ブラッシュアップの方針
- 応募者が伝えたい本質や事実は変えない。嘘や誇張した経歴を加えない。
- 抽象的な表現を具体的に。可能なら成果・行動・強みが伝わる構成にする。
- 採用担当者が読んだときに「会ってみたい」と思える文章にする。
- ${label}として適切な分量・文体（です・ます調）にする。
${jobPosting ? "- 下記の求人情報を踏まえ、その企業・職種にマッチした内容に調整する。" : ""}

# 応募者の情報
${context || "（補足情報なし）"}
${jobPosting ? `\n# 応募先の求人情報\n${jobPosting}` : ""}

# 応募者が書いた元の${label}
${originalText}

ブラッシュアップ後の${label}の本文のみを出力してください。前置きや説明は不要です。`;
}
