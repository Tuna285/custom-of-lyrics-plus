# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> Spicetify를 위한 **Lyrics Plus** 커스텀 버전으로, 고품질 가사 번역에 초점을 맞추어 재구성되었습니다. 주로 베트남 사용자를 위해 최적화되었으며, OpenAI 호환 LLM 엔드포인트에 연결됩니다 — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, 또는 로컬 Ollama.

> [!NOTE]
> **현재 번역 기능은 베트남어(Tiếng Việt)만 지원합니다.** 요청이 있을 경우 향후 업데이트에서 다른 언어 지원이 추가될 수 있습니다.

---

## 주요 기능

### 1. LLM API를 이용한 가사 번역

OpenAI 호환 LLM 엔드포인트(Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, 로컬 Ollama 등)에 연결하여 자연스럽고 정확하게 가사를 번역합니다.

- **내장 엔드포인트 및 모델 프리셋** — 인기 제공자(Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama)를 위한 원클릭 선택기와 큐레이션된 모델 목록; 커스텀 URL/모델도 지원.
- **이중 표시 모드** — 로마자(일본어), 로마자(한국어), 병음(중국어) + **베트남어** 번역 — 언어 학습에 이상적.
- **번역 스타일** — 6가지 톤(스마트 자동 / 시적 / 청춘-애니 / 스트리트-랩 / 빈티지 / 직역)으로 곡의 분위기에 맞춤.
- **대명사 고정** — 9가지 베트남어 대명사 쌍(자동, Anh-Em, Tớ-Cậu, Tao-Mày…)으로 전체 트랙에서 일관된 목소리 유지.
- **사전 번역** — 재생 전에 백그라운드에서 다음 트랙을 번역, 리드 타임 조정 가능.
- **라이브 AI 추론** — 번역 표시기 옆 뇌 아이콘을 클릭하면 드래그 가능한 창이 열려 모델의 사고 과정을 실시간으로 스트리밍(번역 및 발음 탭 분리).
- **응답 형식** — 프롬프트 엔지니어링(범용) 또는 JSON 스키마(지원 모델에서 더 엄격한 파싱, 미지원 시 자동 폴백) 선택.
- **고품질** — 음악적 맥락에 맞게 튜닝된 프롬프트로 의미와 감정 보존.

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. Picture-in-Picture 미니 가사

Spotify의 네이티브 PiP 미니 플레이어에 동기화된 가사를 직접 삽입하여 다른 앱에서 작업하면서 가사를 읽을 수 있습니다. PiP 설정 패널 또는 `Ctrl+Shift+M`으로 토글.

### 3. 비디오 배경

가사 페이지를 위한 YouTube 뮤직비디오 애니메이션 배경. 크기, 밝기, 블러 조정 가능 — 투명 모드 및 모든 Spicetify 테마와 잘 어울립니다.

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 4. 모던 인터페이스 & 최적화된 경험

- **투명 배경** — 모든 Spicetify 테마와 조화.
- **자동 숨김 컨트롤** — 설정 버튼은 호버 시에만 표시되어 최대한 넓은 화면 확보.
- **부드러운 전환** — 줄 전환을 위한 최적화된 애니메이션.
- **완전한 베트남어 UI** — 베트남 사용자를 위한 완전 현지화 🇻🇳.

---

## 설치

> **요구 사항:** [Spotify](https://download.scdn.co/SpotifySetup.exe)는 웹에서 설치하세요. Microsoft Store 버전은 **사용 불가**.

Spicetify 설치:

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```

### 빠른 설치 (권장)

**PowerShell**을 열고 실행:

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
```

### 제거

```powershell
iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
```

### 수동 설치

1. 이 저장소를 다운로드하고 압축 해제
2. `lyrics-plus` 폴더를 Spicetify의 CustomApps 디렉토리에 복사:
   - **Windows:** `%LocalAppData%\spicetify\CustomApps`
   - **MacOS/Linux:** `~/.config/spicetify/CustomApps`

<img width="498" height="367" alt="image" src="https://github.com/user-attachments/assets/31a5b810-ee06-447d-91f4-1e463a601dee" />

3. 터미널에서 실행:
   ```bash
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

---

## 구성

1. Spotify를 열고 아바타 클릭 → **Lyric Plus Translate config**
2. **Translation** 탭으로 이동하여 입력:
   - **API Endpoint** — 프리셋 선택(Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) 또는 OpenAI 호환 URL 붙여넣기.
   - **Model Name** — 드롭다운에서 선택하거나 커스텀 모델 이름 입력.
   - **API Key** — 제공자의 키([Google AI Studio](https://aistudio.google.com/)에서 무료 사용 가능). 최대 2개 키 라운드로빈.
   - **Response Format** — *Prompt Engineering*(모든 모델 지원) 또는 *JSON Schema*(미지원 모델에서 자동 폴백).
   - **Pre-translation** — 켜기/끄기 및 리드 타임 설정(현재 곡이 끝나기 몇 초 전에 다음 곡 번역 시작).
3. 가사 위에 마우스를 올리고 번역 아이콘(⇄)을 클릭하여 **표시 모드**, **번역 스타일**, **대명사** 설정.
4. *(선택 사항)* 트랙 재생 중 `Ctrl+Shift+M`을 눌러 PiP 미니 가사 토글.

---

## 지원 언어

### 로컬 모드 (Kuromoji, Aromanize, OpenCC)

| 소스 언어         | 표시 모드 1                 | 표시 모드 2 |
| ----------------- | --------------------------- | ----------- |
| 일본어 (日本語)    | 로마자, 히라가나, 가타카나   | —           |
| 한국어 (한국어)    | 로마자                      | —           |
| 중국어 (中文)     | 병음, 간체, 번체             | —           |

### AI 모드 (LLM 번역)

| 소스 언어         | 표시 모드 1                    | 표시 모드 2    |
| ----------------- | ------------------------------ | -------------- |
| 일본어 (日本語)    | 로마자 (AI), 로컬 모드 포함     | 베트남어       |
| 한국어 (한국어)    | 로마자 (AI), 로컬 모드 포함     | 베트남어       |
| 중국어 (中文)     | 병음 (AI), 로컬 모드 포함       | 베트남어       |
| 기타              | —                              | 베트남어       |

---

## 크레딧

- 원본 [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 번역 지원: OpenAI 호환 LLM (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, …)
- 로마자 변환: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

## 추천

이 앱과 잘 어울리는 것들:

- 테마: sanoojes의 **[Spicetify Lucid](https://github.com/sanoojes/spicetify-lucid)**.
- TV 모드 및 전체화면 모드: **[Spicetify Creator 제작](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen)**.
*(둘 다 Spicetify Marketplace에서 설치 가능)*

---

## 라이선스

[LGPL-2.1](../../LICENSE)

---

*이 프로젝트는 활발히 개발 중입니다. 문제나 기능 제안이 있으면 알려주세요!*

