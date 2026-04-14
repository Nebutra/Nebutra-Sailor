import { PromptInputBox } from "@nebutra/ui/components";

const AiPromptBoxDemo = () => {
  const _handleSendMessage = (_message: string, _files?: File[]) => {};
  return (
    <div className="flex w-full h-[600px] justify-center items-center rounded-xl bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]">
      <div className="p-4 w-full md:w-[700px]">
        <PromptInputBox onSend={(_message, _files) => {}} />
      </div>
    </div>
  );
};

export { AiPromptBoxDemo };
