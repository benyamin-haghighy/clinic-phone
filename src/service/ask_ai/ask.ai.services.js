const axios = require('axios')
require('dotenv').config()
const { HTTP_TIMEOUT_MS } = require('../../config/settings')
module.exports = async ({ messages, documnets }) => {

    let content = ''

    documnets.forEach(document => {
        content = content + document.content + '\n'
    })
    console.log(content);
    
    const aiMessage = [
        {
            role: "system",
            content: `
تو دستیار هوشمند کلینیک هستی.

اطلاعات زیر از پایگاه اطلاعاتی کلینیک بازیابی شده است:

--- اطلاعات کلینیک ---
${content}
--- پایان اطلاعات کلینیک ---

قوانین پاسخ:

1. سوال آخر کاربر را پاسخ بده.
2. پاسخ را فقط بر اساس اطلاعات کلینیک ارائه کن.
3. اگر جواب سوال در اطلاعات کلینیک وجود دارد، مستقیماً همان اطلاعات را به کاربر بگو.
4. اطلاعاتی که در متن بالا وجود ندارد را حدس نزن و از خودت اضافه نکن.
5. اگر اطلاعات کافی برای پاسخ وجود ندارد، بگو:
"اطلاعات کافی برای پاسخ به این سوال در اختیار ندارم."
6. پاسخ را به زبان فارسی بده.
7. پاسخ را واضح و کوتاه نگه دار.
8. فقط به زبان فارسی و با خط فارسی پاسخ بده. از کلمات انگلیسی، آلمانی یا هر زبان دیگر استفاده نکن
`
        },

        ...messages
    ]

    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: "openrouter/free",
            messages: aiMessage
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
             timeout: HTTP_TIMEOUT_MS
        }
    )

    console.log(response.data.choices[0].message.content)

    return response.data.choices[0].message.content
}