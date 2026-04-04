import React, { useRef } from "react";
import { CSSTransition } from "react-transition-group";
import { AppState } from "../../state/state";
import { CL } from "../../helpers/classNameHelper";
import IconProgress from "../../icons/progress.svg";
import styles from "./Notification.module.scss";

export const Notification = React.memo(
  (props: { notification: AppState["notification"] }) => {
    const refEl = useRef<HTMLDivElement>(null);

    return (
      <div className={styles.box}>
        <CSSTransition
          nodeRef={refEl}
          in={props.notification.visible}
          timeout={300}
          classNames="notification"
          unmountOnExit
        >
          <div
            className={CL(styles.notification, {
              [styles.error]: props.notification.isError,
            })}
            ref={refEl}
          >
            {props.notification.isLoading && <IconProgress />}
            {props.notification.message}
            {props.notification.button ? (
              <span
                className={styles.button}
                onClick={props.notification.button.onClick}
              >
                {props.notification.button.text}
              </span>
            ) : null}
          </div>
        </CSSTransition>
      </div>
    );
  }
);
