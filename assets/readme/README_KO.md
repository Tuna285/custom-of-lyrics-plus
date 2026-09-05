# Lyric Plus Translate

**Language / 言語 / 언어 / Ngôn ngữ / 语言:**
[English](README_EN.md) | [Tiếng Việt](README_VI.md) | [한국어](README_KO.md) | [日本語](README_JA.md) | [中文（简体）](README_ZH.md)

[![Ko-fi](https://img.shields.io/badge/Donate-Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gunjoutuna)



<img width="800" height="800" alt="image" src="https://github.com/user-attachments/assets/32e85501-567d-4896-a7e4-bb4b098a30a6" />

---

> Spicetify를 위한 **Lyrics Plus** 커스텀 버전으로, 고품질 가사 번역, 다국어 지원, 발음 로마자/후리가나 표기, PiP 미니 가사 및 비디오 배경에 중점을 두고 재구성되었습니다. OpenAI 호환 LLM 엔드포인트에 연결할 수 있습니다 — Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude 또는 로컬 Ollama.

> [!TIP]
> **현재 6개 대상 언어 번역 지원:** 베트남어 (`vi`), 영어 (`en`), 일본어 (`ja`), 한국어 (`ko`), 중국어 (`zh`), 우크라이나어 (`uk`). 가사의 자연스러운 음악적 흐름과 맞춤형 작사 스타일을 제공합니다.

---

## 주요 기능

### 1. LLM API를 이용한 가사 번역

OpenAI 호환 LLM 엔드포인트(Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic Claude, 로컬 Ollama 등)에 연결하여 자연스럽고 정확하게 가사를 번역합니다.

- **6개 대상 언어** — 베트남어, 영어, 일본어, 한국어, 중국어, 우크라이나어 번역을 지원하며 각 언어별 작사 스타일 가이드라인과 가드레일을 갖추고 있습니다.
- **음악적인 자연스러운 흐름 (Lyrical Flow)** — 의미를 왜곡하는 억지 음수율이나 어색한 각운 맞추기를 피하고, 원곡의 핵심 심상, 은유, 스토리텔링을 100% 보존하면서 보컬로 자연스럽게 부를 수 있는 유려한 문맥을 완성합니다.
- **내장 엔드포인트 및 모델 프리셋** — 인기 제공자(Gemini 3.8/3.7/3.6, Gemma, OpenRouter, OpenAI, DeepSeek, Claude, Ollama)를 위한 원클릭 선택기 지원; 커스텀 URL/모델도 지원.
- **이중 표시 모드** — 후리가나(일본어 `<ruby>`), 로마자(일본어), 로마자(한국어), 병음(중국어) + 선택한 대상 언어로의 AI 번역.
- **번역 스타일** — 6가지 톤(스마트 자동 / 시적 / 청춘-애니 / 스트리트-랩 / 빈티지 / 직역)으로 곡의 분위기에 맞춤.
- **대명사 모드** — 베트남어를 위한 문맥별 대명사 매핑(자동, Anh-Em, Tớ-Cậu, Tao-Mày…)으로 곡 전체에서 일관된 어조 유지.
- **다중 API 키 로테이션** — 여러 API 키를 등록하여 자동 라운드로빈 부하 분산 및 할당량/속도 제한 초과 시 즉각적인 장애 조치(Failover) 지원.
- **동적 추론(생각 시간) 제어** — AI 생각 예산(`off`, `low`, `medium`, `high`, `auto`) 조정 및 스트리밍 추론 진행 창 지원.
- **사전 번역** — 재생 전에 백그라운드에서 다음 트랙을 번역, 리드 타임 조정 가능.
- **응답 형식** — 프롬프트 엔지니어링(범용) 또는 JSON 스키마(지원 모델에서 더 엄격한 파싱, 미지원 시 자동 폴백) 선택.

| Japanese → Romaji | Korean → Romaja | Chinese → Pinyin |
| ----------------- | --------------- | ---------------- |
|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/e9b7f1f5-0c3c-474d-8fe1-8e2e37552bfb" />|<img width="1919" height="1018" alt="image" src="https://github.com/user-attachments/assets/e8b56a5e-621e-420f-be68-ffc69e3236c1" />|<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/a9e36436-9027-4fbe-a31d-2ffc27d97574" />|

### 2. 통합 멀티 프로바이더 수동 검색

**NetEase**, **LRCLIB**, **Musixmatch**를 아우르는 개선된 수동 검색 다이얼로그를 통해 가사를 검색할 수 있습니다. 인터랙티브 필터 칩, 곡 길이 기반 매칭 점수, 상태 배지(`Synced`, `Unsynced`)를 지원합니다.

### 3. Picture-in-Picture 미니 가사

Spotify의 네이티브 PiP 미니 플레이어에 동기화된 가사를 직접 삽입하여 다른 앱에서 작업하면서 가사를 읽을 수 있습니다. PiP 설정 패널 또는 `Ctrl+Shift+M`으로 토글.

### 4. 비디오 배경 & 시네마 모드

가사 페이지를 위한 YouTube 뮤직비디오 애니메이션 배경. YouTube의 자체 추천 알고리즘을 통한 후보 매칭, 비디오 광고 자동 건너뛰기, 전체 창 시네마 모드(`100vw x 100vh`) 지원(크기, 밝기, 블러 조정 가능).

<img width="1919" height="958" alt="image" src="https://github.com/user-attachments/assets/51520969-7a8f-44e5-bf70-3262e9d658c7" />

### 5. 모던 인터페이스 & 최적화된 경험

- **투명 배경** — 모든 Spicetify 테마와 조화.
- **다국어 UI** — 5개 언어로 완벽 현지화: 영어, 베트남어, 일본어, 한국어, 중국어(간체).
- **자동 숨김 컨트롤** — 설정 버튼은 호버 시에만 표시되어 최대한 넓은 화면 확보.
- **부드러운 전환** — 템포에 적응하는 Apple Music 스타일의 부드러운 이징 라인 전환 및 쉼표 애니메이션.

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
2. **Translation** 탭으로 이동하여 설정:
   - **API Endpoint** — 프리셋 선택(Gemini, OpenRouter, OpenAI, DeepSeek, Claude, Ollama) 또는 OpenAI 호환 URL 붙여넣기.
   - **Model Name** — 프리셋(`gemini-3.8-flash`, `gemini-3.7-flash` 등)에서 선택하거나 커스텀 모델 이름 입력.
   - **API Keys** — 하나 이상의 API 키 추가([Google AI Studio](https://aistudio.google.com/)에서 무료 제공). 여러 키 등록 시 자동 라운드로빈 및 할당량 초과 시 자동 장애 조치.
   - **Reasoning Effort** — 생각 예산 조정(`off`, `low`, `medium`, `high`, `auto`).
   - **Response Format** — *Prompt Engineering*(범용) 또는 *JSON Schema*.
   - **Pre-translation** — 켜기/끄기 및 리드 타임 설정.
3. 가사 위에 마우스를 올리고 번역 아이콘(⇄)을 클릭하여 **대상 언어**, **표시 모드**, **번역 스타일**, **대명사** 설정.
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

| 소스 언어         | 표시 모드 1                    | 표시 모드 2 (대상 언어)             |
| ----------------- | ------------------------------ | ----------------------------------- |
| 일본어 (日本語)    | 후리가나 (AI), 로마자 (AI)     | 베트남어, 영어, 일본어, 한국어, 중국어, 우크라이나어 |
| 한국어 (한국어)    | 로마자 (AI)                    | 베트남어, 영어, 일본어, 한국어, 중국어, 우크라이나어 |
| 중국어 (中文)     | 병음 (AI)                      | 베트남어, 영어, 일본어, 한국어, 중국어, 우크라이나어 |
| 모든 언어         | 로컬 모드 발음                 | 베트남어, 영어, 일본어, 한국어, 중국어, 우크라이나어 |


---

## 크레딧

- 원본 [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) by Spicetify team
- 번역 지원: OpenAI 호환 LLM (Google Gemini/Gemma, OpenRouter, OpenAI, DeepSeek, Anthropic, Ollama, …)
- 로마자 변환: [Kuroshiro](https://github.com/hexenq/kuroshiro), [Aromanize](https://github.com/fujaru/aromanize-js), [OpenCC](https://github.com/BYVoid/OpenCC)

---

<p align="center">
  <a href="https://ko-fi.com/gunjoutuna" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/brandasset/kofi_bg_tag_dark.png" alt="Buy Me a Coffee at ko-fi.com" height="50" style="height: 50px !important; border-radius: 8px;">
  </a>
</p>

---

## 라이선스

[LGPL-2.1](../../LICENSE)

---

*이 프로젝트는 활발히 개발 중입니다. 문제나 기능 제안이 있으면 알려주세요!*


