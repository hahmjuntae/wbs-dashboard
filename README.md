# WBS Dashboard

WBS 엑셀 파일을 올리면 일정 현황을 대시보드로 보여 주는 웹 앱입니다.

## 기능

| 화면 | 내용 |
|---|---|
| 통계 카드 | 전체 작업 수, 상태별 개수, 진행률 |
| 간트 타임라인 | 계획 기간과 실제 기간 |
| 캘린더 | 날짜별 작업 |
| 작업 표 | 에픽, 스토리, 작업 단위 목록 |
| 필터 | 담당자, 파트, 스토리, 상태, 검색어 |

## 입력 파일

| 항목 | 값 |
|---|---|
| 형식 | `.xlsx`, `.xls` |
| 읽는 시트 | `PLAN(WEEKLY)` |
| 시작 행 | 4행 |
| 시트가 없을 때 | `PLAN(WEEKLY) 시트를 찾을 수 없습니다.` 오류 |

파일은 브라우저에서만 처리합니다. 파싱한 작업 목록은 `localStorage` 에 저장하고 서버로 보내지 않습니다.

## 실행

##### 개발 서버

```bash
npm install
npm run dev
```

##### 운영 빌드

```bash
npm run build
npm run start
```

##### 독립 실행 묶음

```bash
npm run build:standalone
```

`dist/wbs-dashboard-<version>.tar.gz` 를 만듭니다.

##### Docker

```bash
npm run docker:build
```

## 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 15, React 19 |
| 스타일 | Tailwind CSS, shadcn/ui |
| 엑셀 읽기 | `xlsx` |

## 라이선스

[MIT](LICENSE)
