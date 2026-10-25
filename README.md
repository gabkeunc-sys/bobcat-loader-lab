# Bobcat Loader Lab

밥캣 S650을 모티브로 만든 Three.js 강의용 로더 시뮬레이션.

## 실행

`dist/`를 정적 웹 서버로 서비스합니다. Python이 설치되어 있다면:

```sh
python -m http.server 8000 --directory dist
```

브라우저에서 http://localhost:8000 을 엽니다. ES 모듈을 사용하므로 파일 더블클릭 대신 HTTP 서버로 실행합니다.

## 조작

- W/A/S/D 또는 방향키: 전진·회전·후진
- Q/E: 리프트 내림·올림
- R/F: 버킷 담기·쏟기
- SPACE 또는 화면 버튼: 조건에 맞으면 적재·하역
- 마우스 드래그/휠: 시점 회전·줌
- 자동 운반 시연: A 구역 적재 → B 구역 운반·하역 → 복귀

## GitHub Pages

동봉된 `.github/workflows/pages.yml`은 main 브랜치의 dist 폴더를 GitHub Pages에 배포합니다. 저장소 Settings → Pages → Source를 GitHub Actions로 설정해야 합니다.

## 범위

직접 제작한 교육용 형상이며 공식 CAD나 실제 장비 운전 훈련 도구가 아닙니다. 실제 유압·타이어 마찰·전도 안정성 계산은 하지 않습니다. 화면의 운전 값은 가상 값입니다. WebGL2가 지원되면 정규 렌더링을 사용하고, 지원되지 않으면 Three.js SVGRenderer 호환 모드를 사용합니다. 호환 모드에서는 그림자와 텍스처 표현이 제한됩니다.

공식 참고: https://www.bobcat.com/kr/ko/equipment/loaders/skid-steer-loaders/s650

Three.js 0.170.0은 MIT 라이선스이며 dist/vendor/THREE-LICENSE.txt에 원문을 포함합니다. 배포 파일에 Three.js를 포함하여 외부 CDN 없이 구동합니다. 웹폰트 로딩이 실패하면 시스템 글꼴을 사용합니다.
