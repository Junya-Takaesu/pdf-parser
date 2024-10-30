'use server';

import { writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function uploadFile(formData: FormData) {
  const file = formData.get('parseTargetFile') as File;
  if (!file) {
    throw new Error('No file uploaded');
  }

  // Save the uploaded file to the filesystem
  const filePath = join('/tmp', file.name);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  // Create an FsReadStream from the saved file
  const fileStream = createReadStream(filePath);

  // Use the FsReadStream in the fileStreams array
  const fileStreams = [fileStream];

  const assistant = await openai.beta.assistants.create({
    name: '出張手配アシスタント',
    temperature: 0,
    instructions: `
        PDFファイルから飛行機のチケットの情報を抽出してください。
        以下の指示に従って、チケットの情報を読み出して教えて下さい。
        - 時間がかかっても良いので、深呼吸して、落ち着いて情報を読み取ってください。
        - チケットはPDFで提供されます。
        - 必ず JSON フォーマットで出力してください。「完了しました」などのテキストは不要です。
        - ファイル名の情報も不要です。
        - チケットを読んで、以下のフォーマットで情報を提供してください。
        {
            "出発地": "東京",
            "到着地": "大阪",
            "出発日": "2022-12-31",
            "到着日": "2022-12-31",
            "便名": "NH1234",
            "座席": "12A"
        }
        - 上記で指定されている項目以外にも、チケットに含まれる情報があれば、それも含めて提供してください。
        - タスクの実行に際して問題が発生した場合は、以下のフォーマットでエラーメッセージを提供してください。
        {
            "error": {問題の原因, 問題の内容, etc}
        }
        - ユーザーが「手配状況を教えて下さい」と言った場合は、以下のフォーマットで情報を提供してください。
    `,
    model: 'gpt-4o',
    tools: [
      {
        type: 'file_search',
      },
    ],
  });

  console.log(assistant);

  // Create a vector store including our two files.
  const vectorStore = await openai.beta.vectorStores.create({
    name: '出張手配アシスタント',
  });

  await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
    files: fileStreams,
  });

  await openai.beta.assistants.update(assistant.id, {
    tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user',
        content: `手配状況を教えて下さい`
      },
    ],
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  const messages = await openai.beta.threads.messages.list(thread.id, {
    run_id: run.id,
  });

  const message = messages.data.pop()!;
  let responseJson = null;
  if (message.content[0].type === 'text') {
    const { text } = message.content[0];
    const { annotations } = text;
    const citations: string[] = [];
    let index = 0;
    for (const annotation of annotations) {
      text.value = text.value.replace(annotation.text, '[' + index + ']');
      const { file_citation } = annotation;
      if (file_citation) {
        const citedFile = await openai.files.retrieve(file_citation.file_id);
        citations.push('[' + index + ']' + citedFile.filename);
      }
      index++;
    }
    console.log(text.value);
    responseJson = JSON.parse(text.value);
  }

  return responseJson;
}