import Scorecard from '../Scorecard'
import CommentaryFeed from './CommentaryFeed'

export default function GameFinished({ players, scorecard, holePars, holeNumber, commentary, onStart }) {
  return (
    <>
      <div className="broadcast-finished">
        <span className="bf-badge">FINAL</span>
        <span className="bf-text">18 Holes Complete</span>
      </div>
      <Scorecard players={players} scorecard={scorecard} holePars={holePars} holeNumber={holeNumber} gameFinished />
      <CommentaryFeed commentary={commentary} />
      <div className="board-controls">
        <button className="control-btn control-start" onClick={onStart}>New Game</button>
      </div>
    </>
  )
}
