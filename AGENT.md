# Agent Guidelines

## 배포 (Deployment)

### 배포 전 필수 체크사항

**⚠️ 중요: 배포 전 반드시 로컬 빌드를 실행하여 컴파일 에러가 없는지 확인해야 합니다.**

```bash
npm run build
```

빌드가 성공적으로 완료된 후에만 다음 단계를 진행합니다:

1. 변경사항 커밋
```bash
git add .
git commit -m "commit message"
```

2. GitHub에 푸시
```bash
git push
```

3. Vercel 배포
```bash
npx vercel --prod
```

### 배포 실패 시 대응

- 빌드 에러가 발생하면 모든 TypeScript/컴파일 에러를 한번에 수정
- 로컬에서 빌드가 성공할 때까지 반복 테스트
- 에러 수정 후 다시 전체 프로세스 진행

