import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def _run_law_pipeline_sync():
    from tax_law_pipeline.run_pipeline import run

    try:
        result = run()
        print(f"[law-pipeline] 완료: {result}")
    except Exception as exc:
        print(f"[law-pipeline] 실패: {exc}")


@router.post("/run-law-pipeline")
async def run_law_pipeline(background_tasks: BackgroundTasks, x_admin_token: str = Header(...)):
    if not settings.ADMIN_PIPELINE_TOKEN or not hmac.compare_digest(x_admin_token, settings.ADMIN_PIPELINE_TOKEN):
        raise HTTPException(status_code=403, detail="Forbidden")

    background_tasks.add_task(_run_law_pipeline_sync)
    return {
        "status": "started",
        "note": "백그라운드에서 실행 중입니다. Render Logs 탭에서 진행 상황을 확인하세요.",
    }
