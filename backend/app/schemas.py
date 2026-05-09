from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class TypoItem(BaseModel):
    """错别字"""
    wrong: str = Field(..., description="错误的字/词")
    correct: str = Field(..., description="正确的字/词")
    context: str = Field("", description="所在原句，便于定位")
    reason: str = Field("", description="错误原因说明")


class SentenceIssue(BaseModel):
    """病句 / 表达问题"""
    original: str = Field(..., description="原句")
    suggestion: str = Field(..., description="修改建议")
    issue_type: str = Field("", description="问题类型，如：搭配不当 / 语序不当 / 成分残缺 / 啰嗦")


class EssayResult(BaseModel):
    """作文批改结果"""
    # model_essay 字段以 model_ 开头会和 pydantic 受保护命名空间冲突，禁用该保护
    model_config = ConfigDict(protected_namespaces=())

    recognized_text: str = Field(..., description="OCR识别出的作文原文")
    title: str = Field("", description="作文题目（如能识别）")
    genre: str = Field("", description="文体，如：导游词 / 记叙文 / 议论文 等")
    word_count: int = Field(0, description="字数")
    typos: List[TypoItem] = Field(default_factory=list, description="错别字列表")
    sentence_issues: List[SentenceIssue] = Field(default_factory=list, description="病句列表")
    revised_text: str = Field("", description="修改后的清洁版全文（保留学生笔法的扫盲版）")
    model_essay: str = Field("", description="过关级范文（以学生主题/人物/事件为骨架重写的过关版）")
    structure_comment: str = Field("", description="结构评价")
    content_comment: str = Field("", description="立意/内容评价")
    language_comment: str = Field("", description="语言/文采评价")
    overall_comment: str = Field("", description="总评")
    score: Optional[int] = Field(None, description="建议分数，0-100")
    suggestions: List[str] = Field(default_factory=list, description="给学生的具体修改建议")


CopyVerdict = Literal["独立表达", "照搬答案", "答案错误", "部分照搬"]


class SubjectiveQuestionItem(BaseModel):
    """单题查重判定"""
    question: str = Field("", description="题目（如能识别）")
    student_answer: str = Field(..., description="学生作答")
    reference_answer: str = Field("", description="参考答案")
    correctness: Literal["正确", "部分正确", "错误"] = Field(..., description="意思是否正确")
    copy_verdict: CopyVerdict = Field(..., description="是否照搬参考答案")
    similarity_explanation: str = Field("", description="相似度判断依据")
    teacher_comment: str = Field("", description="给学生的评语 / 修改建议")


class SubjectiveResult(BaseModel):
    """主观题查重结果（一张图可能多题）"""
    items: List[SubjectiveQuestionItem]
    summary: str = Field("", description="整体批注摘要")
