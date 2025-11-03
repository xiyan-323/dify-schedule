import { WorkflowClient } from '../sdk/dify.js'
import env from '../utils/env.js'
import Notify from "../utils/notify.js";

// === 新增：日期判断逻辑 ===
function shouldRunToday() {
  const startDate = new Date('2025-10-28'); // 可自行设置一个开始基准日
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  // 每运行10天，休息1天（第11天跳过）
  return diffDays % 11 !== 0;
}
// ==========================

class Task {
    constructor(dify) {
      this.dify = dify;
    }

    taskName = "";

    async run() {}

    toString() {
      return `[${this.taskName}]`;
    }
}

class WorkflowTask extends Task {
    taskName = "Dify工作流任务";

    async run() {
      if(!env.DIFY_BASE_URL) {
        throw new Error("没有配置Dify api地址，请检查后执行!");
      }
      let inputs = {}
      try {
        inputs = env.DIFY_INPUTS ? JSON.parse(env.DIFY_INPUTS) : {}
      } catch (error) {
        console.error('DIFY_INPUTS 格式错误，请确保是json格式, 可能会影响任务流执行')
      }
      const user = 'dify-schedule'
      const workflow = new WorkflowClient(this.dify.token, env.DIFY_BASE_URL);
      console.log(`正在获取Dify工作流基础信息...`)
      const info = await workflow.info(user);
      this.workfolwName = info.data?.name || '';
      console.log(`Dify工作流【${info.data.name}】开始执行...`)
      const response =  await workflow.getWorkflowResult(inputs, user,true)
      this.result = response.text || ''
    }

    toString() {
        return this.result
    }
}

async function run(args) {
     // === 新增：执行前判断 ===
  if (!shouldRunToday()) {
    console.log("今天是暂停日（第11天），跳过执行。");
    Notify.pushMessage({
      title: "Dify工作流定时助手",
      content: "今天是第11天，暂停执行。",
      msgtype: "text"
    });
    return;
  }
  // ======================
    const tokens = env.DIFY_TOKENS.split(';');
    let messageList = [];
    for (let token of tokens) {
      const workflow = new WorkflowTask({token});

      await workflow.run(); // 执行

      const content = workflow.toString();

      console.log(content); // 打印结果

      messageList.push(content);
    }

    const message = messageList.join(`\n${"-".repeat(15)}\n`);
    Notify.pushMessage({
      title: "Dify工作流定时助手",
      content: message,
      msgtype: "text"
    });
  }

  run(process.argv.splice(2)).catch(error => {
    Notify.pushMessage({
      title: "",
      content: `Error: ${error.message}`,
      msgtype: "html"
    });

    throw error;
  });
