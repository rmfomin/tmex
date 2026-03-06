// import React, { useContext, useEffect } from "react";
// import { Modal } from "./Modal";
// import IconHelp from "../../icons/help.svg";
// import { trackStat } from "../../helpers/stats";
// import { Action } from "../../state/state";
// import { DispatchContext } from "../../state/actions";

// export const JoinBetaModal = (p: { onClose: () => void }) => {
//   const dispatch = useContext(DispatchContext);

//   const [email, setEmail] = React.useState<string>("");
//   const [screen, setScreen] = React.useState("first");

//   useEffect(() => {
//     trackStat("betaModalShown", {});
//   });

//   const joinBeta = () => {
//     setScreen("second");
//     trackStat("betaModalJoined", { email });
//     localStorage.setItem("betaMode", "true");
//     localStorage.setItem("userEmail", email);
//     dispatch({
//       type: Action.UpdateAppState,
//       newState: { betaMode: true },
//     });
//   };

//   const onClose = () => {
//     if (screen === "first") {
//       trackStat("betaModalClosed", {});
//     }
//     p.onClose();
//   };

//   return (
//     <Modal onClose={onClose}>
//       <>
//         {screen === "first" && (
//           <div className="modal-no-override">
//             <h2>Be the First to Try Spaces — Join the Beta!</h2>
//             <p>
//               Tabme is free, and all existing features will{" "}
//               <b>
//                 <i>stay free forever</i>
//               </b>
//               .<br />
//               But I’m working on a paid Pro Version with exciting upgrades:
//               <br />
//               <br />✅ Spaces – Better folder organization (
//               <b>
//                 <i>Try it already in Beta for free!</i>
//               </b>
//               )<br />
//               🔄 Sync Across Devices (Coming Soon)
//               <br />
//               👥 Team Sharing (Planned)
//               <br />
//               💾 Daily Backups & more (Planned)
//               <br />
//               <br />
//               You can switch back to the free version anytime with a single
//               click.
//               <br />
//               <br />
//               <input
//                 className="normal-input"
//                 type="email"
//                 style={{ width: "182px" }}
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 title="Enter your email here"
//                 placeholder="Enter your email here"
//               />
//               <p className="description-text">
//                 I need your email to inform you when <i>Beta program</i> be
//                 updated.
//                 <br />
//                 By providing your email, you agree with{" "}
//                 <a href="https://gettabme.com/policy.html" target="_blank">
//                   Privacy Policy
//                 </a>
//                 .
//               </p>
//               <button
//                 className="btn__setting primary"
//                 disabled={!email.includes("@")}
//                 onClick={joinBeta}
//               >
//                 Join Beta to try Spaces
//               </button>
//             </p>
//           </div>
//         )}
//         {screen === "second" && (
//           <div className="modal-no-override">
//             <h2>🎉 Welcome to the Tabme Beta!</h2>
//             <p>
//               Now you can start organizing your bookmarks and folders with{" "}
//               <b>Spaces</b>
//               <br />
//               <br />
//               1️⃣ Click the ➕ (“plus”) button to create a new space.
//               <br />
//               2️⃣ Use drag-and-drop to sort spaces in your preferred order.
//               <br />
//               3️⃣ Double-click on a space’s name to rename it.
//               <br />
//               4️⃣ Right-click on a space to open the context menu, then select
//               Delete to remove it.
//               <br />
//               <br />
//               💡 Tip: Spaces help keep your bookmarks structured, <br />
//               making it easier to switch between different workflows!
//               <br />
//               <br />
//               Let me know what you think by "Send Feedback" in{" "}
//               <IconHelp
//                 style={{ display: "inline-block", verticalAlign: "bottom" }}
//               />{" "}
//               <br />– your feedback is invaluable!
//               <br />
//               <br />
//             </p>
//             <button className="btn__setting primary" onClick={onClose}>
//               Got it!
//             </button>
//           </div>
//         )}
//       </>
//     </Modal>
//   );
// };
