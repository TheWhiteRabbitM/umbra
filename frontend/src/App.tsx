import { useEffect, useState } from "react";
import { useApp } from "./hooks/useApp";
import { TopBar } from "./components/TopBar";
import { Rail } from "./components/Rail";
import { TabBar } from "./components/TabBar";
import { Aside } from "./components/Aside";
import { Landing } from "./components/Landing";
import { CommandPalette } from "./components/CommandPalette";
import { MessagesView } from "./components/views/MessagesView";
import { MailView } from "./components/views/MailView";
import { WalletView } from "./components/views/WalletView";
import { IndividualityView } from "./components/views/IndividualityView";
import { NetworkView } from "./components/views/NetworkView";
import { SettingsView } from "./components/views/SettingsView";

export default function App() {
  const store = useApp();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (store.wallet) setEntered(true);
  }, [store.wallet]);

  // Entering the demo is implicit once the user navigates from the landing.
  const inApp = entered;

  return (
    <div className="shell">
      <TopBar store={store} />
      {inApp ? (
        <>
          <div className="shell-body">
            <Rail store={store} />
            <main className="view">{renderView(store)}</main>
            <Aside store={store} />
          </div>
          <TabBar store={store} />
        </>
      ) : (
        <Landing store={withEnter(store, () => setEntered(true))} />
      )}
      <CommandPalette store={store} />
    </div>
  );
}

function renderView(store: ReturnType<typeof useApp>) {
  switch (store.view) {
    case "messages":
      return <MessagesView store={store} />;
    case "mail":
      return <MailView store={store} />;
    case "wallet":
      return <WalletView store={store} />;
    case "individuality":
      return <IndividualityView store={store} />;
    case "network":
      return <NetworkView store={store} />;
    case "settings":
      return <SettingsView store={store} />;
  }
}

/** Wrap setView/connect so the landing's CTAs also flip into the app. */
function withEnter(store: ReturnType<typeof useApp>, enter: () => void): ReturnType<typeof useApp> {
  return {
    ...store,
    setView: (v) => {
      enter();
      store.setView(v);
    },
  };
}
