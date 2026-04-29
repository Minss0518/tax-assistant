from openai import OpenAI
import base64
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

async def extract_receipt_info(image_bytes: bytes) -> dict:
    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """이 영수증 이미지에서 다음 정보를 추출해줘.
반드시 아래 JSON 형식으로만 답변해줘. 다른 말은 하지마.
{
  "amount": 숫자만(원 단위),
  "date": "YYYY-MM-DD",
  "memo": "구매한 항목이나 상호명",
  "type": "expense"
}
날짜를 모르면 오늘 날짜, 금액을 모르면 0으로 해줘."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=200
    )

    import json
    text = response.choices[0].message.content.strip()
    text = text.replace('```json', '').replace('```', '').strip()
    result = json.loads(text)
    return result