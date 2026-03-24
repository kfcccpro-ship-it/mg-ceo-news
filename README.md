# MG CEO를 위한 키워드 뉴스

모바일 중심 뉴스 웹앱입니다. 뉴스는 **새마을금고 → 농협 → 은행권** 순서로 제목 중심으로 보여주며, 제목을 누르면 원문으로 이동합니다.

## 특징
- 네이버 뉴스 검색 API 기반
- GitHub Pages 배포 가능
- GitHub Actions로 매일 오전 8시 / 오후 1시 자동 갱신
- 시니어 친화 UI
- 글자 크기 버튼(작게 / 기본 / 크게)
- 오늘의 핵심 뉴스 TOP 3 자동 정리
- 읽은 기사 표시

## 꼭 확인하세요
- **API 키는 웹페이지 파일에 넣지 마세요.**
- 이 프로젝트는 **GitHub Secrets**에만 키를 저장하는 구조입니다.
- 링크를 받은 사용자는 **API 키 입력 없이 바로 뉴스만 보게 됩니다.**

## 1. GitHub 저장소에 업로드
압축 해제 후 전체 파일을 새 GitHub 저장소 루트에 업로드합니다.

## 2. GitHub Secrets 등록
저장소에서 아래 경로로 이동합니다.

`Settings → Secrets and variables → Actions`

다음 두 개를 추가합니다.

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

네이버 뉴스 검색 API는 공식 문서상 `https://openapi.naver.com/v1/search/news.json` 엔드포인트를 사용하며, 요청 헤더에 `X-Naver-Client-Id`, `X-Naver-Client-Secret`을 포함해야 합니다.

## 3. 첫 뉴스 생성
저장소 상단의 `Actions` 탭으로 이동한 뒤 `Update news data` 워크플로를 수동 실행합니다.

그러면 `data/news.json` 파일이 샘플 데이터에서 실제 뉴스 데이터로 갱신됩니다.

## 4. GitHub Pages 켜기
`Settings → Pages`

- Source: `Deploy from a branch`
- Branch: `main` / root

저장 후 배포 링크가 생성됩니다.

## 동작 구조
1. GitHub Actions가 네이버 API를 호출합니다.
2. 결과를 `data/news.json` 으로 저장합니다.
3. GitHub Pages는 그 JSON만 읽어서 화면에 보여줍니다.
4. 사용자들은 링크만 열면 됩니다.

## 참고
- Actions 스케줄은 UTC 기준입니다.
- 현재 워크플로의 `0 23 * * *`, `0 4 * * *`는 한국시간 오전 8시, 오후 1시를 의미합니다.
- 사용자는 링크만 열면 되고, API 키를 입력할 필요가 없습니다. API 키는 GitHub Secrets에만 저장됩니다.
- 이 압축파일 안에는 **실제 API 키가 저장되어 있지 않습니다.** 보안을 위해 반드시 GitHub 저장소에서 직접 Secrets로 입력하세요.
